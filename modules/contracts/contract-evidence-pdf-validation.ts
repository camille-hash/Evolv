import "server-only";

import {
  getDocument,
  PasswordException,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";

export class PdfValidationError extends Error {
  readonly kind: "password-protected" | "structure-invalid";

  constructor(kind: "password-protected" | "structure-invalid") {
    super(kind);
    this.kind = kind;
  }
}

export async function validatePdfStructure(bytes: Uint8Array): Promise<void> {
  let loadingTask: PDFDocumentLoadingTask | undefined;
  let document: PDFDocumentProxy | undefined;

  try {
    loadingTask = getDocument({
      // PDF.js may transfer ownership of the supplied typed array. Keep the
      // ingestion bytes intact for the hash and eventual upload.
      data: bytes.slice(),
      useWasm: false,
      verbosity: 0,
    });
    document = await loadingTask.promise;
    if (document.numPages < 1) throw new Error("PDF has no pages");
    await document.getPage(1);
  } catch (error) {
    if (error instanceof PasswordException || readErrorName(error) === "PasswordException") {
      throw new PdfValidationError("password-protected");
    }
    if (error instanceof PdfValidationError) throw error;
    throw new PdfValidationError("structure-invalid");
  } finally {
    if (document) await document.cleanup().catch(() => undefined);
    if (loadingTask) await loadingTask.destroy().catch(() => undefined);
  }
}

function readErrorName(error: unknown) {
  return error && typeof error === "object" && "name" in error
    ? String(error.name)
    : "";
}
