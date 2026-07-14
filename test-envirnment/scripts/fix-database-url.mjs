import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
let raw = fs.readFileSync(envPath, "utf8");
const m = raw.match(/^DATABASE_URL=(.*)$/m);
if (!m) {
  console.error("No DATABASE_URL in .env");
  process.exit(1);
}

let v = m[1].trim();
if (
  (v.startsWith('"') && v.endsWith('"')) ||
  (v.startsWith("'") && v.endsWith("'"))
) {
  v = v.slice(1, -1);
}

const before = v;
if (v.startsWith("postgres:postgresql://")) {
  v = v.slice("postgres:".length);
}
if (v.startsWith("postgres:postgres://")) {
  v = "postgresql://" + v.slice("postgres:postgres://".length);
}
// Fix sslmode=require/<junk> (path accidentally stuck onto sslmode value)
v = v.replace(/([?&]sslmode=)require\/[^&\s"]+/i, "$1require");

if (!/^postgres(ql)?:\/\//i.test(v)) {
  console.error("DATABASE_URL still invalid after repair");
  process.exit(1);
}

raw = raw.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${v}`);
fs.writeFileSync(envPath, raw);

const redacted = v.replace(/:([^:@/]+)@/, ":***@");
console.log("fixed:", before !== v);
console.log("url:", redacted);
