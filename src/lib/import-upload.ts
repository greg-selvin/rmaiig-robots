export const MAX_IMPORT_FILE_BYTES = 15_000_000;
export const IMPORT_STAGING_BUCKET = "rmaiig-import-staging";

export function importUploadError(filename: string, size: number): string | null {
  if (!Number.isSafeInteger(size) || size <= 0) return "Choose a non-empty file";
  if (size > MAX_IMPORT_FILE_BYTES) return "File exceeds the 15 MB upload limit";
  if (!/\.(csv|xlsx|json)$/i.test(filename)) return "Choose a CSV, XLSX, or JSON file";
  return null;
}
