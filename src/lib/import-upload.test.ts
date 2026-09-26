import { describe, expect, it } from "vitest";
import { importUploadError, MAX_IMPORT_FILE_BYTES } from "./import-upload";

describe("import upload limits", () => {
  it("accepts supported files through the 15 MB limit", () => {
    expect(importUploadError("robots.json", MAX_IMPORT_FILE_BYTES)).toBeNull();
  });

  it("rejects files larger than 15 MB", () => {
    expect(importUploadError("robots.json", MAX_IMPORT_FILE_BYTES + 1)).toBe("File exceeds the 15 MB upload limit");
  });

  it("rejects empty files and unsupported formats", () => {
    expect(importUploadError("robots.csv", 0)).toBe("Choose a non-empty file");
    expect(importUploadError("robots.pdf", 100)).toBe("Choose a CSV, XLSX, or JSON file");
  });
});
