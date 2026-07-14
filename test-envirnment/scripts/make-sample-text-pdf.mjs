/**
 * Ensure fixtures/sample-text.pdf is a text-layer PDF that pdf-parse@1.1.4 can read.
 * Uses the W3C dummy PDF (stable, tiny, known-good with old pdf.js).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "fixtures", "sample-text.pdf");
const url =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

const res = await fetch(url);
if (!res.ok) {
  throw new Error(`Failed to download sample PDF: ${res.status} ${res.statusText}`);
}
const bytes = Buffer.from(await res.arrayBuffer());
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, bytes);
console.log("wrote", out, "bytes", bytes.length);

const pdfParse = (await import("pdf-parse")).default;
const data = await pdfParse(bytes);
const text = (data.text || "").trim();
console.log("extracted:", JSON.stringify(text));
if (!text) {
  process.exit(1);
}
