import fs from "node:fs/promises";
import path from "node:path";
import { extractExpenseDocument } from "./extract.js";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run extract -- <path-to-image>");
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);
const result = await extractExpenseDocument(resolvedInput);

await fs.mkdir("outputs", { recursive: true });

const baseName = path.basename(resolvedInput, path.extname(resolvedInput));
const outputPath = path.join("outputs", `${baseName}.json`);

await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(JSON.stringify(result, null, 2));
console.log(`Saved to ${outputPath}`);

