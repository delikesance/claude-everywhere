// @vitest-environment node
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtractionError } from "./error";
import { extractPdf } from "./pdf";
import { polyfillFirefoxRuntime, readFixture } from "./testing";

const PDF_URL = "https://example.org/files/sample%20notes.pdf";
const NODE_WORKER = pathToFileURL(resolve("node_modules/pdfjs-dist/build/pdf.worker.mjs")).href;

function stubFetch(impl: () => Promise<Response>): void {
  vi.stubGlobal("fetch", vi.fn(impl));
}

async function errorOf(promise: Promise<unknown>): Promise<ExtractionError> {
  const error = await promise.catch((e: unknown) => e);
  if (!(error instanceof ExtractionError)) throw new Error("expected an ExtractionError");
  return error;
}

describe("extractPdf", () => {
  beforeEach(() => {
    polyfillFirefoxRuntime();
    vi.stubGlobal("browser", { runtime: { getURL: () => NODE_WORKER } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("extracts the text of every page with page markers", async () => {
    stubFetch(async () => new Response(new Uint8Array(readFixture("sample.pdf"))));
    const page = await extractPdf(PDF_URL);
    expect(page).toMatchObject({ sourceType: "pdf", url: PDF_URL, title: "sample notes.pdf" });
    expect(page.markdown).toContain("--- page 1 ---");
    expect(page.markdown).toContain("First page of the sample document.");
    expect(page.markdown).toContain("--- page 2 ---");
    expect(page.markdown).toContain("The quick brown fox jumps over the lazy dog.");
  });

  it("reports a denied fetch as a permission error carrying the origin", async () => {
    stubFetch(() => Promise.reject(new TypeError("NetworkError")));
    expect((await errorOf(extractPdf(PDF_URL))).data).toMatchObject({
      kind: "permission",
      origin: "https://example.org/*",
    });
  });

  it("reports an HTTP failure as pdf_failed", async () => {
    stubFetch(async () => new Response("nope", { status: 404 }));
    expect((await errorOf(extractPdf(PDF_URL))).data.kind).toBe("pdf_failed");
  });

  it("reports a corrupt file as pdf_failed", async () => {
    stubFetch(async () => new Response("not a pdf"));
    expect((await errorOf(extractPdf(PDF_URL))).data.kind).toBe("pdf_failed");
  });
});
