#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.tsx$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const file of walk(path.join(ROOT, "app"))) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  content = content.replace(
    /from "@\/features\/([^"/]+)\/ui\/screens(?:\/[^"]+)?";/g,
    'from "@/features/$1";',
  );
  content = content.replace(
    /import ([A-Za-z]+) from "@\/features\/([^"/]+)";\n\nexport default \1;/g,
    'export { $1 as default } from "@/features/$2";',
  );
  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    console.log("updated:", path.relative(ROOT, file));
  }
}

console.log("App route imports now use feature public barrels.");
