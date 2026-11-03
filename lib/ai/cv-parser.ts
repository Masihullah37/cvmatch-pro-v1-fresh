import { createRequire } from "module";

const require = createRequire(import.meta.url);

export type CVFileType = "pdf" | "doc" | "docx";

const PDF_SIGNATURE = Buffer.from("%PDF");
const DOC_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function docxHtmlToText(html: string): string {
  const { load } = require("cheerio") as typeof import("cheerio");
  const $ = load(html);

  $("br").replaceWith("\n");
  $("table").each((_, table) => {
    const rows = $(table).find("tr").map((__, row) =>
      $(row)
        .children("th, td")
        .map((___, cell) => $(cell).text().replace(/\s+/g, " ").trim())
        .get()
        .join(" | "),
    ).get();
    $(table).replaceWith(`${rows.join("\n")}\n`);
  });
  $("li").each((_, item) => {
    $(item).prepend("• ").append("\n");
  });
  $("p, h1, h2, h3, h4, h5, h6").each((_, element) => {
    $(element).append("\n");
  });

  return $("body")
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocxXmlText(buffer: Buffer): Promise<string> {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const relationshipFile = zip.file("_rels/.rels");
  const relationships = relationshipFile
    ? await relationshipFile.async("string")
    : "";
  const documentTarget = relationships.match(
    /<Relationship\b(?=[^>]*\bType=["'][^"']*\/officeDocument["'])[^>]*\bTarget=["']([^"']+)["']/i,
  )?.[1]?.replace(/^\/+/, "");
  const xmlPaths = Object.keys(zip.files).filter((path) =>
    /^word\/(?:document(?:\d+)?|header\d*|footer\d*|footnotes|endnotes)\.xml$/i.test(path),
  );
  if (documentTarget && zip.file(documentTarget)) {
    xmlPaths.unshift(documentTarget);
  }

  const uniquePaths = [...new Set(xmlPaths)];
  if (!uniquePaths.length) {
    throw new Error("Le document Word ne contient pas de document XML lisible.");
  }

  const decodeXml = (value: string) => value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

  const documentTexts: string[] = [];
  for (const path of uniquePaths) {
    const xml: string = await zip.file(path)!.async("string");
    const paragraphs: string[] =
      xml.match(/<(?:[\w.-]+:)?p\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?p\s*>/gi) || [];
    const text = paragraphs
      .map((paragraph) => {
        const withBreaks = paragraph
          .replace(/<(?:[\w.-]+:)?tab\b[^>]*\/>/gi, " ")
          .replace(/<(?:[\w.-]+:)?(?:br|cr)\b[^>]*\/>/gi, "\n");
        return (withBreaks.match(/<(?:[\w.-]+:)?t\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?t\s*>/gi) || [])
          .map((element) => decodeXml(element.replace(/^<[^>]*>|<\/[^>]*>$/g, "")))
          .join("")
          .trim();
      })
      .filter(Boolean);
    if (paragraphs.length && text.length) documentTexts.push(text.join("\n"));
  }

  return documentTexts.join("\n").trim();
}

export function getCVFileType(buffer: Buffer, filename: string): CVFileType {
  const cleanPath = filename.toLowerCase().split(/[?#]/, 1)[0].replace(/[\\/]+$/, "");
  const filenameOnly = cleanPath.slice(Math.max(cleanPath.lastIndexOf("/"), cleanPath.lastIndexOf("\\")) + 1);
  const extensionIndex = filenameOnly.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? filenameOnly.slice(extensionIndex) : "";

  if (extension === ".pdf") {
    if (!buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
      throw new Error("Le fichier PDF est invalide ou endommagé.");
    }
    return "pdf";
  }

  if (extension === ".docx") {
    if (buffer.length < 4 || buffer.subarray(0, 2).toString("ascii") !== "PK") {
      throw new Error("Le fichier Word .docx est invalide ou endommagé.");
    }
    return "docx";
  }

  if (extension === ".doc") {
    if (buffer.length < DOC_SIGNATURE.length || !buffer.subarray(0, DOC_SIGNATURE.length).equals(DOC_SIGNATURE)) {
      throw new Error("Le fichier Word .doc est invalide ou endommagé.");
    }
    return "doc";
  }

  if (!extension && buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    return "pdf";
  }

  throw new Error("Format de fichier non pris en charge. Importez un fichier PDF, .doc ou .docx.");
}

export async function parseCVFile(buffer: Buffer, filename: string): Promise<string> {
  try {
    const fileType = getCVFileType(buffer, filename);

    if (fileType === "pdf") {
      const PDFParser = require("pdf2json");
      const pdfParser = new (PDFParser.default || PDFParser)(null, 1);

      return await new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: { parserError?: string }) => {
          reject(new Error(errData.parserError || "Échec de l'extraction du texte du PDF."));
        });

        pdfParser.on("pdfParser_dataReady", () => {
          const text = pdfParser.getRawTextContent();
          if (!text || !text.trim()) {
            reject(new Error("Le PDF ne contient pas de texte sélectionnable."));
          } else {
            resolve(text);
          }
        });

        pdfParser.parseBuffer(buffer);
      });
    }

    if (fileType === "docx") {
      const mammoth = require("mammoth");
      let text = "";
      const extractionErrors: unknown[] = [];
      try {
        const result = await mammoth.convertToHtml({ buffer });
        text = docxHtmlToText(result.value || "");
      } catch (error) {
        extractionErrors.push(error);
      }

      if (!text.trim()) {
        try {
          const result = await mammoth.extractRawText({ buffer });
          text = result.value || "";
        } catch (error) {
          extractionErrors.push(error);
        }
      }
      if (!text.trim()) {
        try {
          text = await extractDocxXmlText(buffer);
        } catch (error) {
          extractionErrors.push(error);
        }
      }
      if (!text.trim()) {
        const lastError = extractionErrors.at(-1);
        const detail = lastError instanceof Error ? ` ${lastError.message}` : "";
        throw new Error(`Le document Word .docx ne contient aucun texte lisible.${detail}`);
      }
      return text;
    }

    const WordExtractor = require("word-extractor");
    const document = await new WordExtractor().extract(buffer);
    const text = document.getBody() || "";
    if (!text.trim()) {
      throw new Error("Le document Word .doc ne contient aucun texte lisible.");
    }
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("CV Parsing Error:", message);
    throw new Error(`Impossible de lire le fichier CV : ${message}`);
  }
}
