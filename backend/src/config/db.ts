import mongoose from "mongoose";
import dns from "node:dns";
import { execSync } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

async function configureDnsForAtlas(atlasUri: string): Promise<void> {
  const match = atlasUri.match(/@([^/?]+)/);
  const hostname = match?.[1];
  if (!hostname) return;

  const srvHost = `_mongodb._tcp.${hostname}`;

  try {
    await dns.promises.resolveSrv(srvHost);
    return;
  } catch {
    // default DNS failed
  }

  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    await dns.promises.resolveSrv(srvHost);
    return;
  } catch {
    // public DNS failed
  }

  if (process.platform === "win32") {
    try {
      const output = execSync(
        'powershell -NoProfile -Command "(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses"',
        { encoding: "utf8" },
      );
      const ips = output
        .split(/[\r\n]+/)
        .map((s) => s.trim())
        .filter((s) => s && s !== "127.0.0.1");
      if (ips.length > 0) {
        dns.setServers(ips);
      }
    } catch {
      // ignore
    }
  }
}

const connectDB = async (): Promise<void> => {
  try {
    const useInMemory = process.env.USE_IN_MEMORY_MONGO === "true";
    const atlasUri = process.env.MONGO_URI?.trim();

    if (!atlasUri && !useInMemory) {
      console.error("❌ MongoDB Error: MONGO_URI is not set.");
      process.exit(1);
    }

    if (useInMemory) {
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
      console.log("✅ MongoDB Connected (In-Memory)");
      return;
    }

    await configureDnsForAtlas(atlasUri!);

    await mongoose.connect(atlasUri!, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log("✅ MongoDB Connected (Atlas)");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ MongoDB Error:", message);
    process.exit(1);
  }
};

export default connectDB;
