import fs from "node:fs";
import { spawnSync } from "node:child_process";

spawnSync(process.execPath, ["scripts/fix-dist-imports.mjs"], {
  stdio: "inherit",
});
const s = fs.readFileSync("dist/index.js", "utf8");
const bare = /from ['"]sqlite['"]/.test(s);
const node = s.includes("node:sqlite");
console.log(JSON.stringify({ bareSqliteImport: bare, nodeSqlite: node }));
process.exit(bare ? 1 : 0);
