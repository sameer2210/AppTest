#!/usr/bin/env node
/**
 * Replace raw StyleSheet / inline fontSize/fontWeight with fontTextStyles presets.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const UI_ROOT = path.join(ROOT, "src", "features");

/** @type {Record<string, string>} key: `${size}|${weight}` */
const PRESET_BY_SIZE_WEIGHT = {
  "8|300": "eightLightBlack",
  "8|400": "eightNormalBlack",
  "8|500": "eightMediumBlack",
  "8|600": "eightSemiBoldBlack",
  "8|700": "eightBoldBlack",
  "10|400": "twelveNormalBlack",
  "10|500": "twelveMediumBlack",
  "10|700": "twelveBoldBlack",
  "12|400": "fourteenNormalBlack",
  "12|500": "fourteenMediumBlack",
  "12|600": "fourteenSemiBoldBlack",
  "12|700": "fourteenBoldBlack",
  "12|bold": "fourteenBoldBlack",
  "13|600": "sixteenSemiBoldBlack",
  "14|400": "sixteenNormalBlack",
  "14|500": "sixteenMediumBlack",
  "14|700": "sixteenBoldBlack",
  "15|400": "sixteenNormalBlack",
  "16|400": "eighteenNormalBlack",
  "16|500": "eighteenMediumBlack",
  "16|700": "eighteenBoldBlack",
  "18|400": "twentyTwoNormalBlack",
  "18|700": "twentyTwoBoldBlack",
  "20|400": "twentyFourNormalBlack",
  "20|500": "twentyFourMediumBlack",
  "20|700": "twentyFourBoldBlack",
  "20|bold": "twentyFourBoldBlack",
  "24|700": "twentyEightBoldBlack",
  "24|bold": "twentyEightBoldBlack",
  "28|700": "size30BoldBlack",
  "28|bold": "size30BoldBlack",
  "32|700": "size34BoldBlack",
  "32|bold": "size34BoldBlack",
};

function normalizeWeight(value) {
  if (!value) return "400";
  const v = String(value).replace(/['"]/g, "").trim();
  if (v === "bold") return "bold";
  return v;
}

function presetFor(size, weight) {
  const w = normalizeWeight(weight);
  return PRESET_BY_SIZE_WEIGHT[`${size}|${w}`] ?? PRESET_BY_SIZE_WEIGHT[`${size}|400`];
}

function ensureImport(content) {
  if (content.includes("fontTextStyles")) return content;
  if (content.includes('from "@/utils/typography"')) {
    return content.replace(
      /import\s+\{([^}]+)\}\s+from\s+"@\/utils\/typography";/,
      (match, imports) => {
        if (imports.includes("fontTextStyles")) return match;
        return `import { fontTextStyles,${imports} } from "@/utils/typography";`;
      },
    );
  }
  const importLine = 'import { fontTextStyles } from "@/utils/typography";\n';
  const lastImport = content.lastIndexOf('\nimport ');
  if (lastImport === -1) return importLine + content;
  const end = content.indexOf("\n", lastImport + 1);
  return `${content.slice(0, end + 1)}${importLine}${content.slice(end + 1)}`;
}

function stripTypographyProps(body) {
  return body
    .replace(/\n\s*fontSize:\s*\d+,?/g, "")
    .replace(/\n\s*fontWeight:\s*["'][^"']+["'],?/g, "")
    .replace(/\n\s*fontFamily:\s*["'][^"']+["'],?/g, "")
    .replace(/\n\s*lineHeight:\s*\d+,?/g, "")
    .replace(/\n\s*letterSpacing:\s*[-\d.]+,?/g, "")
    .trim();
}

function transformStyleObject(body) {
  const sizeMatch = body.match(/fontSize:\s*(\d+)/);
  if (!sizeMatch) return null;
  const weightMatch = body.match(/fontWeight:\s*["']([^"']+)["']/);
  const preset = presetFor(Number(sizeMatch[1]), weightMatch?.[1]);
  if (!preset) return null;
  const rest = stripTypographyProps(body);
  if (!rest) return `{ ...fontTextStyles.${preset} }`;
  return `{\n    ...fontTextStyles.${preset},\n    ${rest.replace(/\n/g, "\n    ")}\n  }`;
}

function transformInlineStyle(styleContent) {
  const sizeMatch = styleContent.match(/fontSize:\s*(\d+)/);
  if (!sizeMatch) return null;
  const weightMatch = styleContent.match(/fontWeight:\s*["']([^"']+)["']/);
  const preset = presetFor(Number(sizeMatch[1]), weightMatch?.[1]);
  if (!preset) return null;
  const rest = stripTypographyProps(styleContent).replace(/,\s*$/, "");
  if (!rest) return `[fontTextStyles.${preset}]`;
  return `[fontTextStyles.${preset}, { ${rest} }]`;
}

function transformContent(content) {
  let next = content;
  let changed = false;

  next = next.replace(/(\w+):\s*\{([^{}]*fontSize:[^{}]*)\}/g, (full, key, body) => {
    const transformed = transformStyleObject(body);
    if (!transformed) return full;
    changed = true;
    return `${key}: ${transformed}`;
  });

  next = next.replace(/style=\{\{([^{}]*fontSize:[^{}]*)\}\}/g, (full, body) => {
    const transformed = transformInlineStyle(body);
    if (!transformed) return full;
    changed = true;
    return `style={${transformed}}`;
  });

  next = next.replace(/style=\{\s*\{([^{}]*fontWeight:\s*["']bold["'][^{}]*)\}\s*\}/g, (full, body) => {
    if (body.includes("fontSize:")) return full;
    changed = true;
    const rest = stripTypographyProps(body);
    if (!rest) return "style={[fontTextStyles.sixteenBoldBlack]}";
    return `style={[fontTextStyles.sixteenBoldBlack, { ${rest} }]}`;
  });

  if (changed) next = ensureImport(next);
  return { next, changed };
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

let updated = 0;
for (const file of walk(UI_ROOT)) {
  const content = fs.readFileSync(file, "utf8");
  if (!/fontSize:|fontWeight:|fontFamily:|lineHeight:|letterSpacing:/.test(content)) continue;
  const { next, changed } = transformContent(content);
  if (changed && next !== content) {
    fs.writeFileSync(file, next, "utf8");
    updated += 1;
    console.log("updated", path.relative(ROOT, file));
  }
}

console.log(`\nTypography codemod updated ${updated} files.`);
