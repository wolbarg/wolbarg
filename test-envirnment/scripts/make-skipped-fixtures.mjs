/**
 * Create fixtures required for previously skipped ingest steps:
 * - sample.pdf (text layer — keeps original scan as sample-scan.pdf)
 * - sample.docx
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "fixtures");

fs.mkdirSync(fixtures, { recursive: true });

const samplePdf = path.join(fixtures, "sample.pdf");
const scanBackup = path.join(fixtures, "sample-scan.pdf");
const sampleDocx = path.join(fixtures, "sample.docx");

// Preserve scan/image PDF if present and not already backed up.
if (fs.existsSync(samplePdf) && !fs.existsSync(scanBackup)) {
  // Probe text layer
  let hasText = false;
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const probed = await pdfParse(fs.readFileSync(samplePdf));
    hasText = (probed.text ?? "").trim().length > 0;
  } catch {
    hasText = false;
  }
  if (!hasText) {
    fs.copyFileSync(samplePdf, scanBackup);
    console.log("backed up scan PDF → fixtures/sample-scan.pdf");
  }
}

const pdfUrl =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const pdfRes = await fetch(pdfUrl);
if (!pdfRes.ok) {
  throw new Error(`PDF download failed: ${pdfRes.status}`);
}
const pdfBytes = Buffer.from(await pdfRes.arrayBuffer());
fs.writeFileSync(samplePdf, pdfBytes);
console.log("wrote fixtures/sample.pdf", pdfBytes.length, "bytes");

const pdfParse = (await import("pdf-parse")).default;
const pdfText = ((await pdfParse(pdfBytes)).text ?? "").trim();
if (!pdfText) {
  throw new Error("sample.pdf still has no extractable text");
}
console.log("pdf text:", JSON.stringify(pdfText));

// Build a minimal DOCX (OOXML zip) without heavy deps.
const { default: JSZip } = await import("jszip").catch(async () => {
  console.log("installing jszip temporarily…");
  spawnSync("npm", ["install", "jszip", "--no-save"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  return import("jszip");
});

const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
);
const rels = zip.folder("_rels");
if (!rels) throw new Error("failed to create _rels folder");
rels.file(
  ".rels",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
);
const word = zip.folder("word");
if (!word) throw new Error("failed to create word folder");
word.file(
  "document.xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>AgentOrc sample DOCX. Widgets pricing and refunds policy for Acme Corp.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Customers may request refunds within 30 days of purchase for unused widgets.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
);

const docxBuf = await zip.generateAsync({ type: "nodebuffer" });
fs.writeFileSync(sampleDocx, docxBuf);
console.log("wrote fixtures/sample.docx", docxBuf.length, "bytes");

const mammoth = await import("mammoth");
const extracted = await mammoth.extractRawText({ buffer: docxBuf });
console.log("docx text:", JSON.stringify(extracted.value.trim()));
if (!extracted.value.trim()) {
  throw new Error("sample.docx produced empty text via mammoth");
}

console.log("fixtures ready");
