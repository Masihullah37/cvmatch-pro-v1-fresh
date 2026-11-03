import JSZip from "jszip";
import { getCVFileType, parseCVFile } from "@/lib/ai/cv-parser";

const DOCX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const DOCX_RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function createDocxBuffer(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", DOCX_CONTENT_TYPES);
  zip.file("_rels/.rels", DOCX_RELATIONSHIPS);
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("CV file parsing", () => {
  it("detects PDF, legacy Word, and DOCX signatures by file type", () => {
    expect(getCVFileType(Buffer.from("%PDF-1.7"), "resume.pdf")).toBe("pdf");
    expect(
      getCVFileType(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), "resume.doc"),
    ).toBe("doc");
    expect(getCVFileType(Buffer.from([0x50, 0x4b, 0x03, 0x04]), "resume.docx")).toBe("docx");
  });

  it("extracts text from a valid DOCX without using PDF extraction", async () => {
    const buffer = await createDocxBuffer("Product manager with five years of experience.");

    await expect(parseCVFile(buffer, "resume.docx")).resolves.toContain(
      "Product manager with five years of experience.",
    );
  });

  it("reports invalid or unsupported Word documents clearly", async () => {
    await expect(parseCVFile(Buffer.from("not a Word file"), "resume.doc")).rejects.toThrow(
      "Le fichier Word .doc est invalide ou endommagé.",
    );
    const legacyWordHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await expect(
      parseCVFile(Buffer.concat([legacyWordHeader, Buffer.alloc(512)]), "corrupted.doc"),
    ).rejects.not.toThrow("PDF");
    expect(() => getCVFileType(Buffer.from("bad"), "resume.rtf")).toThrow(
      "Format de fichier non pris en charge.",
    );
  });
});
