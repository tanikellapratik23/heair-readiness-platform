import { createHash } from "node:crypto";

/**
 * The initial Neon-backed upload path is deliberately small. It keeps the
 * original text file plus its retrieval chunks in the same database and is not
 * intended for large files or records containing regulated student data.
 */
export const COACH_CONTEXT_MAX_BYTES = 2 * 1024 * 1024;
export const COACH_CONTEXT_MAX_DOCUMENTS_PER_USER = 12;
export const COACH_CONTEXT_MAX_TEXT_CHARACTERS = 200_000;
export const COACH_CONTEXT_CHUNK_WORDS = 360;
export const COACH_CONTEXT_CHUNK_STRIDE_WORDS = 280;

const supportedFormats: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".csv": "text/csv",
  ".json": "application/json"
};

export type ParsedCoachContextDocument = {
  fileName: string;
  title: string;
  mediaType: string;
  bytes: Buffer;
  text: string;
  sha256: string;
  chunks: string[];
};

function extensionOf(fileName: string) {
  const match = /\.[a-z0-9]+$/i.exec(fileName.trim());
  return match?.[0].toLocaleLowerCase() ?? "";
}

function safeFileName(fileName: string) {
  const cleaned = fileName.replace(/[\\/\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > 180) throw new Error("Provide a file name up to 180 characters.");
  return cleaned;
}

export function chunkCoachContextText(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += COACH_CONTEXT_CHUNK_STRIDE_WORDS) {
    const chunk = words.slice(start, start + COACH_CONTEXT_CHUNK_WORDS).join(" ");
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

export function parseCoachContextUpload(fileName: string, contentBase64: string): ParsedCoachContextDocument {
  const safeName = safeFileName(fileName);
  const mediaType = supportedFormats[extensionOf(safeName)];
  if (!mediaType) throw new Error("Upload a .txt, .md, .csv, or .json document. PDF and Word support require the approved document-processing service.");

  const encoded = contentBase64.replace(/\s/g, "");
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error("The uploaded file could not be read.");
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length) throw new Error("The uploaded file is empty.");
  if (bytes.byteLength > COACH_CONTEXT_MAX_BYTES) throw new Error("Each private context document is limited to 2 MB.");

  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("The uploaded file must be UTF-8 text.");
  }
  const text = decoded.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
  if (text.length < 20) throw new Error("Add a document with enough text for the AI Coach to use.");
  if (text.length > COACH_CONTEXT_MAX_TEXT_CHARACTERS) throw new Error("This document contains too much text for the private coach context limit.");

  const title = safeName.replace(/\.[a-z0-9]+$/i, "").slice(0, 180) || "Private context";
  return {
    fileName: safeName,
    title,
    mediaType,
    bytes,
    text,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    chunks: chunkCoachContextText(text)
  };
}
