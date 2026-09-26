import { beforeEach, describe, expect, it, vi } from "vitest";
import { IMPORT_STAGING_BUCKET, MAX_IMPORT_FILE_BYTES } from "@/lib/import-upload";

const mocks = vi.hoisted(() => ({
  authorizedRole: vi.fn(),
  adminClient: vi.fn(),
  listBuckets: vi.fn(),
  createBucket: vi.fn(),
  updateBucket: vi.fn(),
  createSignedUploadUrl: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/server", () => ({ authorizedRole: mocks.authorizedRole, adminClient: mocks.adminClient }));

import { DELETE, POST } from "./route";

function request(filename: string, size: number) {
  return new Request("http://localhost/api/import/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename, size }) });
}

describe("import upload signing endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SECRET_KEY = "test-key";
    mocks.authorizedRole.mockResolvedValue({ role: "admin", user: { id: "user-1" } });
    mocks.listBuckets.mockResolvedValue({ data: [], error: null });
    mocks.createBucket.mockResolvedValue({ data: { name: IMPORT_STAGING_BUCKET }, error: null });
    mocks.updateBucket.mockResolvedValue({ data: { message: "ok" }, error: null });
    mocks.createSignedUploadUrl.mockResolvedValue({ data: { path: "user-1/uuid.json", token: "upload-token", signedUrl: "https://storage.example" }, error: null });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.adminClient.mockReturnValue({ storage: { listBuckets: mocks.listBuckets, createBucket: mocks.createBucket, updateBucket: mocks.updateBucket, from: () => ({ createSignedUploadUrl: mocks.createSignedUploadUrl, remove: mocks.remove }) } });
  });

  it("creates a private 15 MB staging bucket and returns a signed upload", async () => {
    const response = await POST(request("robots.json", MAX_IMPORT_FILE_BYTES));
    expect(response.status).toBe(200);
    expect(mocks.createBucket).toHaveBeenCalledWith(IMPORT_STAGING_BUCKET, { public: false, fileSizeLimit: MAX_IMPORT_FILE_BYTES });
    expect(mocks.createSignedUploadUrl).toHaveBeenCalledWith(expect.stringMatching(/^user-1\/.+\.json$/));
    expect(await response.json()).toEqual({ path: "user-1/uuid.json", token: "upload-token", bucket: IMPORT_STAGING_BUCKET });
  });

  it("rejects non-admins before issuing upload access", async () => {
    mocks.authorizedRole.mockResolvedValue({ role: "member", user: { id: "user-1" } });
    expect((await POST(request("robots.json", 100))).status).toBe(403);
    expect(mocks.adminClient).not.toHaveBeenCalled();
  });

  it("rejects files over 15 MB and unsupported formats", async () => {
    expect((await POST(request("robots.json", MAX_IMPORT_FILE_BYTES + 1))).status).toBe(413);
    expect((await POST(request("robots.pdf", 100))).status).toBe(400);
    expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("privatizes and resizes an existing staging bucket", async () => {
    mocks.listBuckets.mockResolvedValue({ data: [{ name: IMPORT_STAGING_BUCKET, public: true, file_size_limit: 5_000_000 }], error: null });
    expect((await POST(request("robots.csv", 100))).status).toBe(200);
    expect(mocks.updateBucket).toHaveBeenCalledWith(IMPORT_STAGING_BUCKET, { public: false, fileSizeLimit: MAX_IMPORT_FILE_BYTES });
  });

  it("allows an admin to remove only their own staged file", async () => {
    const response = await DELETE(new Request("http://localhost/api/import/upload", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "user-1/upload.json" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith(["user-1/upload.json"]);
    expect((await DELETE(new Request("http://localhost/api/import/upload", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "another-user/upload.json" }),
    }))).status).toBe(400);
  });
});
