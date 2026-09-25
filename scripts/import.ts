import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { sourceRowSchema } from "../src/lib/import";
import { rowsFromUpload, runImport } from "../src/lib/import-runner";

process.loadEnvFile(".env.local");

const name=process.argv.find(arg=>!arg.startsWith("-")&&arg!==process.argv[0]&&arg!==process.argv[1])||"data/technophilosoph-2026.json";
const dryRun=!process.argv.includes("--commit");
const bytes=await readFile(resolve(name));
const rows=name.endsWith(".json")
  ? sourceRowSchema.array().parse(JSON.parse(bytes.toString()).rows)
  : await rowsFromUpload(basename(name),bytes);
const result=await runImport(rows,basename(name),dryRun);
console.log(JSON.stringify(result,null,2));
