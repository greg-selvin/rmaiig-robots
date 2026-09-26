import { adminClient, authorizedRole } from "@/lib/server";
import { rowsFromUpload, runImport, runJsonImport } from "@/lib/import-runner";
import { parseJsonImport } from "@/lib/json-import";
import { IMPORT_STAGING_BUCKET, importUploadError, MAX_IMPORT_FILE_BYTES } from "@/lib/import-upload";

export async function POST(request: Request) {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  if (!process.env.SUPABASE_SECRET_KEY) return Response.json({ error: "Server key is not configured" }, { status: 503 });

  let stagedPath: string | null = null;
  let storageClient: ReturnType<typeof adminClient> | null = null;
  try {
    const contentType = request.headers.get("content-type") || "";
    let filename: string;
    let dryRun: boolean;
    let buffer: Buffer;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const path = typeof body.path === "string" ? body.path : "";
      const rawFilename = typeof body.filename === "string" ? body.filename : "";
      filename = rawFilename.split(/[\\/]/).pop() || "";
      dryRun = body.dry_run !== false;
      const validationError = importUploadError(filename, 1);
      if (validationError) return Response.json({ error: validationError }, { status: 400 });
      const userPrefix = `${auth.user.id}/`;
      if (!path.startsWith(userPrefix) || path.slice(userPrefix.length).includes("/") || !path.toLowerCase().endsWith(filename.slice(filename.lastIndexOf(".")).toLowerCase())) {
        return Response.json({ error: "Invalid staged upload" }, { status: 400 });
      }
      stagedPath = path;
      storageClient = adminClient();
      const { data, error } = await storageClient.storage.from(IMPORT_STAGING_BUCKET).download(path);
      if (error || !data) return Response.json({ error: "Could not read uploaded file" }, { status: 400 });
      const sizeError = importUploadError(filename, data.size);
      if (sizeError) return Response.json({ error: sizeError }, { status: data.size > MAX_IMPORT_FILE_BYTES ? 413 : 400 });
      buffer = Buffer.from(await data.arrayBuffer());
    } else {
      const form = await request.formData();
      const file = form.get("file");
      dryRun = form.get("dry_run") !== "false";
      if (!(file instanceof File)) return Response.json({ error: "File required" }, { status: 400 });
      filename = file.name;
      const validationError = importUploadError(filename, file.size);
      if (validationError) return Response.json({ error: validationError }, { status: file.size > MAX_IMPORT_FILE_BYTES ? 413 : 400 });
      buffer = Buffer.from(await file.arrayBuffer());
    }

    const result = filename.toLowerCase().endsWith(".json")
      ? await runJsonImport(parseJsonImport(buffer.toString("utf8")), filename, dryRun, auth.user.id)
      : await runImport(await rowsFromUpload(filename, buffer), filename, dryRun, auth.user.id);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 400 });
  } finally {
    if (storageClient && stagedPath) {
      try {
        await storageClient.storage.from(IMPORT_STAGING_BUCKET).remove([stagedPath]);
      } catch {}
    }
  }
}
