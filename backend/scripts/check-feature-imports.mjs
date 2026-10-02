import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const featuresRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/features",
);

const DEEP_IMPORT =
  /from ["'](?:(?:\.\.\/)+|@\/features\/)([a-z0-9-]+)\/(services|models|controllers|validators)\//;

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__test__" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
};

const violations = [];
for (const file of walk(featuresRoot)) {
  const rel = path.relative(featuresRoot, file).replaceAll("\\", "/");
  const fromModule = rel.split("/")[0];
  const text = fs.readFileSync(file, "utf8");
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    const match = line.match(DEEP_IMPORT);
    if (!match) continue;
    const targetModule = match[2];
    if (targetModule === fromModule) continue;
    violations.push(`${rel}:${i + 1} ${line.trim()}`);
  }
}

if (violations.length) {
  console.error("Cross-module deep imports (use features/<name>/index.ts):\n");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log("Import boundary check passed.");
