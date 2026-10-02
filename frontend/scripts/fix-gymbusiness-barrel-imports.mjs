import fs from "fs";
import path from "path";
import { globSync } from "glob";

const ROOT = path.resolve("src/features/gymBusiness");
const API_EXPORTS = new Set(["DEFAULT_ANALYTICS_DATA", "generateMemberWhatsAppText"]);
const CLIENT_EXPORTS = new Set(["gymBusinessClient", "useGymBusinessClient"]);

const files = globSync("**/*.{ts,tsx}", { cwd: ROOT, absolute: true });

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes('@/features/gymBusiness')) continue;

  const importRegex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']@\/features\/gymBusiness["'];?/g;
  let match;
  const replacements = [];

  while ((match = importRegex.exec(content)) !== null) {
    const isTypeOnly = Boolean(match[1]);
    const names = match[2]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const sliceNames = [];
    const apiNames = [];
    const clientNames = [];

    for (const entry of names) {
      const aliasMatch = entry.match(/^(\w+)\s+as\s+(\w+)$/);
      const name = aliasMatch ? aliasMatch[1] : entry.replace(/^type\s+/, "").trim();
      if (CLIENT_EXPORTS.has(name)) {
        clientNames.push(entry);
      } else if (API_EXPORTS.has(name)) {
        apiNames.push(entry);
      } else {
        sliceNames.push(entry);
      }
    }

    const dir = path.dirname(file);
    const toSlice = path
      .relative(dir, path.join(ROOT, "model/gymBusiness.slice"))
      .replace(/\\/g, "/");
    const toApi = path.relative(dir, path.join(ROOT, "api/gymBusiness.api")).replace(/\\/g, "/");
    const toClient = path
      .relative(dir, path.join(ROOT, "ui/hooks/useGymBusinessClient"))
      .replace(/\\/g, "/");

    const normalize = (p) => (p.startsWith(".") ? p : `./${p}`);
    const newImports = [];

    if (sliceNames.length) {
      newImports.push(
        `${isTypeOnly ? "import type" : "import"} { ${sliceNames.join(", ")} } from "${normalize(toSlice)}";`,
      );
    }
    if (apiNames.length) {
      newImports.push(`import { ${apiNames.join(", ")} } from "${normalize(toApi)}";`);
    }
    if (clientNames.length) {
      newImports.push(`import { ${clientNames.join(", ")} } from "${normalize(toClient)}";`);
    }

    replacements.push({ original: match[0], replacement: newImports.join("\n") });
  }

  for (const { original, replacement } of replacements) {
    content = content.replace(original, replacement);
  }

  fs.writeFileSync(file, content);
  console.log("fixed:", path.relative(process.cwd(), file));
}
