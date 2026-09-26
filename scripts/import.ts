import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { sourceRowSchema } from "../src/lib/import";
import { rowsFromUpload, runImport, runJsonImport } from "../src/lib/import-runner";
import { parseJsonImport } from "../src/lib/json-import";

process.loadEnvFile(".env.local");

const name=process.argv.find(arg=>!arg.startsWith("-")&&arg!==process.argv[0]&&arg!==process.argv[1])||"data/technophilosoph-2026.json";
const dryRun=!process.argv.includes("--commit");
const bytes=await readFile(resolve(name));
let result;
if(name.toLowerCase().endsWith(".json")) {
  const value=JSON.parse(bytes.toString());
  result=value.format==="rmaiig-robots-import/v1"
    ? await runJsonImport(parseJsonImport(bytes.toString()),basename(name),dryRun)
    : await runImport(sourceRowSchema.array().parse(value.rows),basename(name),dryRun);
} else {
  result=await runImport(await rowsFromUpload(basename(name),bytes),basename(name),dryRun);
}
console.log(JSON.stringify(result,null,2));
