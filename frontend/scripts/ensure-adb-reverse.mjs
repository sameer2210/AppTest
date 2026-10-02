import { execSync } from "child_process";

try {
  const devicesOutput = execSync("adb devices", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const lines = devicesOutput.split(/\r?\n/);
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && parts[1] === "device") {
      const serial = parts[0];
      try {
        execSync(`adb -s ${serial} reverse tcp:8081 tcp:8081`, { stdio: "ignore" });
        execSync(`adb -s ${serial} reverse tcp:8000 tcp:8000`, { stdio: "ignore" });
        console.log(`[ADB] Reversed ports 8081 + 8000 on device ${serial}`);
      } catch {
        // ignore per-device reverse errors
      }
    }
  }
} catch {
  // adb not in PATH or no devices attached — ignore gracefully
}
