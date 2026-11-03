import JSZip from "jszip";
import { getCVFileType, parseCVFile } from "@/lib/ai/cv-parser";
import { mapImportedCvData } from "@/lib/cv/import-mapping";

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

function createStructuredResumeDocxBuffer(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", DOCX_CONTENT_TYPES);
  zip.file("_rels/.rels", DOCX_RELATIONSHIPS);
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
    </Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
    </w:styles>`,
  );
  zip.file(
    "word/numbering.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    </w:numbering>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Professional Experience</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Senior Product Manager</w:t></w:r></w:p>
        <w:tbl>
          <w:tblPr/><w:tblGrid/>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Example GmbH</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>2021 - 2024</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
        <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Led a cross-functional team of 12 people</w:t></w:r></w:p>
        <w:sectPr/>
      </w:body>
    </w:document>`,
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

  it("extracts headings, formatted paragraphs, tables, and list items from a DOCX CV", async () => {
    const buffer = await createStructuredResumeDocxBuffer();
    const text = await parseCVFile(buffer, "structured-resume.docx");

    expect(text).toContain("Professional Experience");
    expect(text).toContain("Senior Product Manager");
    expect(text).toContain("Example GmbH | 2021 - 2024");
    expect(text).toContain("• Led a cross-functional team of 12 people");

    const mapped = mapImportedCvData({}, text);
    expect(mapped.experience).toContainEqual(expect.objectContaining({
      description: expect.stringContaining("Example GmbH | 2021 - 2024"),
    }));
    expect(mapped.experience).toContainEqual(expect.objectContaining({
      description: expect.stringContaining("Led a cross-functional team of 12 people"),
    }));
    expect(mapped.additionalSections).toBeUndefined();
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
