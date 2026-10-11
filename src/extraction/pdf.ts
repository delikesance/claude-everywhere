import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import type { ExtractedPage } from "../shared/types";
import { PDF_MAX_BYTES, PDF_MAX_CHARS, PDF_MAX_PAGES, PDF_WORKER_FILE } from "./constants";
import { errorData, ExtractionError } from "./error";
import { makePage } from "./make-page";

const pageMarker = (pageNumber: number) => `--- page ${pageNumber} ---`;

const tooLarge = () => new ExtractionError(errorData("pdf_failed", "The PDF is too large"));

async function readCapped(response: Response): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > PDF_MAX_BYTES) throw tooLarge();
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer());
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    received += chunk.value.byteLength;
    if (received > PDF_MAX_BYTES) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

// No credentials and no custom headers: the API key is only ever attached by the SDK client to the API base URL.
async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { credentials: "omit" }).catch(() => {
    throw new ExtractionError(errorData("permission", "The PDF origin is not readable", `${new URL(url).origin}/*`));
  });
  if (!response.ok) throw new ExtractionError(errorData("pdf_failed", `PDF download failed (${response.status})`));
  return readCapped(response);
}

async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  GlobalWorkerOptions.workerSrc = browser.runtime.getURL(PDF_WORKER_FILE);
  try {
    return await getDocument({ data: bytes, useWasm: false, disableFontFace: true }).promise;
  } catch {
    throw new ExtractionError(errorData("pdf_failed", "The PDF could not be parsed"));
  }
}

async function pageText(pdf: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const content = await (await pdf.getPage(pageNumber)).getTextContent();
  return content.items.map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : "")).join("").trim();
}

async function documentText(pdf: PDFDocumentProxy): Promise<string> {
  const sections: string[] = [];
  let length = 0;
  for (let n = 1; n <= Math.min(pdf.numPages, PDF_MAX_PAGES) && length < PDF_MAX_CHARS; n++) {
    const section = `${pageMarker(n)}\n${await pageText(pdf, n)}`;
    sections.push(section);
    length += section.length;
  }
  return sections.join("\n\n").slice(0, PDF_MAX_CHARS);
}

function fileName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "") || url;
}

export async function extractPdf(url: string): Promise<ExtractedPage> {
  const pdf = await openPdf(await fetchPdfBytes(url));
  try {
    const markdown = await documentText(pdf);
    if (!markdown.replaceAll(/--- page \d+ ---/g, "").trim()) {
      throw new ExtractionError(errorData("empty", "The PDF has no text layer"));
    }
    return makePage({ url, title: fileName(url), sourceType: "pdf", markdown });
  } finally {
    await pdf.loadingTask.destroy();
  }
}
