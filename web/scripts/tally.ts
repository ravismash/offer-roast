import { readFileSync } from "node:fs";
import { parseCsv, tally } from "../src/lib/tally.ts";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run tally -- <sessions.csv>");
  process.exit(1);
}
const result = tally(parseCsv(readFileSync(path, "utf8")));
console.log(JSON.stringify(result, null, 2));
