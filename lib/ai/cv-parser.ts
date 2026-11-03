import { createRequire } from "module";

const require = createRequire(import.meta.url);

export type CVFileType = "pdf" | "doc" | "docx";

const PDF_SIGNATURE = Buffer.from("%PDF");
const DOC_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

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
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || "";
      if (!text.trim()) {
        throw new Error("Le document Word .docx ne contient aucun texte lisible.");
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
