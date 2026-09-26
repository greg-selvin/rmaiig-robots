import { adminClient, authorizedRole } from "@/lib/server";
import { IMPORT_STAGING_BUCKET, importUploadError, MAX_IMPORT_FILE_BYTES } from "@/lib/import-upload";

export async function POST(request: Request) {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  if (!process.env.SUPABASE_SECRET_KEY) return Response.json({ error: "Server key is not configured" }, { status: 503 });

  try {
    const body = await request.json();
    const filename = typeof body.filename === "string" ? body.filename : "";
    const size = typeof body.size === "number" ? body.size : NaN;
    const validationError = importUploadError(filename, size);
    if (validationError) return Response.json({ error: validationError }, { status: size > MAX_IMPORT_FILE_BYTES ? 413 : 400 });

    const storage = adminClient().storage;
    const { data: buckets, error: listError } = await storage.listBuckets();
    if (listError) return Response.json({ error: "Could not prepare secure upload" }, { status: 503 });
    const bucket = buckets.find(item => item.name === IMPORT_STAGING_BUCKET);

    if (!bucket) {
      const { error } = await storage.createBucket(IMPORT_STAGING_BUCKET, { public: false, fileSizeLimit: MAX_IMPORT_FILE_BYTES });
      if (error) {
        const { data: currentBuckets, error: currentError } = await storage.listBuckets();
        const currentBucket = currentBuckets?.find(item => item.name === IMPORT_STAGING_BUCKET);
        if (currentError || !currentBucket) return Response.json({ error: "Could not prepare secure upload" }, { status: 503 });
        if (currentBucket.public || currentBucket.file_size_limit !== MAX_IMPORT_FILE_BYTES) {
          const { error: updateError } = await storage.updateBucket(IMPORT_STAGING_BUCKET, { public: false, fileSizeLimit: MAX_IMPORT_FILE_BYTES });
          if (updateError) return Response.json({ error: "Could not prepare secure upload" }, { status: 503 });
        }
      }
    } else if (bucket.public || bucket.file_size_limit !== MAX_IMPORT_FILE_BYTES) {
      const { error } = await storage.updateBucket(IMPORT_STAGING_BUCKET, { public: false, fileSizeLimit: MAX_IMPORT_FILE_BYTES });
      if (error) return Response.json({ error: "Could not prepare secure upload" }, { status: 503 });
    }

    const extension = filename.match(/\.(csv|xlsx|json)$/i)?.[0].toLowerCase();
    const path = `${auth.user.id}/${crypto.randomUUID()}${extension}`;
    const { data, error } = await storage.from(IMPORT_STAGING_BUCKET).createSignedUploadUrl(path);
    if (error) return Response.json({ error: "Could not prepare secure upload" }, { status: 503 });
    return Response.json({ path: data.path, token: data.token, bucket: IMPORT_STAGING_BUCKET });
  } catch {
    return Response.json({ error: "Could not prepare secure upload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  if (!process.env.SUPABASE_SECRET_KEY) return Response.json({ error: "Server key is not configured" }, { status: 503 });

  try {
    const body = await request.json();
    const path = typeof body.path === "string" ? body.path : "";
    const userPrefix = `${auth.user.id}/`;
    if (!path.startsWith(userPrefix) || path.slice(userPrefix.length).includes("/")) return Response.json({ error: "Invalid staged upload" }, { status: 400 });
    const { error } = await adminClient().storage.from(IMPORT_STAGING_BUCKET).remove([path]);
    if (error) return Response.json({ error: "Could not remove staged upload" }, { status: 503 });
    return Response.json({ removed: true });
  } catch {
    return Response.json({ error: "Could not remove staged upload" }, { status: 400 });
  }
}
