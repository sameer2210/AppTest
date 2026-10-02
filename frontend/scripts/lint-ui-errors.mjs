import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let out;
try {
  out = execSync('npx eslint "src/features/**/ui/**/*.tsx" -f json', {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
} catch (e) {
  out = e.stdout ?? "";
}
const data = JSON.parse(out);
const errors = [];
for (const r of data) {
  for (const m of r.messages) {
    if (m.severity === 2) {
      errors.push({
        file: path.relative(root, r.filePath).replace(/\\/g, "/"),
        line: m.line,
        rule: m.ruleId,
        msg: m.message,
      });
    }
  }
}
console.log(`Total errors: ${errors.length}`);
const byFile = {};
for (const e of errors) {
  (byFile[e.file] ??= []).push(e);
}
for (const f of Object.keys(byFile).sort()) {
  console.log(`\n${f} (${byFile[f].length}):`);
  for (const e of byFile[f]) {
    console.log(`  L${e.line}: ${e.msg}`);
  }
}
