import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizedRole: vi.fn(),
  rowsFromUpload: vi.fn(),
  runImport: vi.fn(),
  runJsonImport: vi.fn(),
}));
vi.mock("@/lib/server", () => ({ authorizedRole: mocks.authorizedRole }));
vi.mock("@/lib/import-runner", () => ({ rowsFromUpload: mocks.rowsFromUpload, runImport: mocks.runImport, runJsonImport: mocks.runJsonImport }));

import { POST } from "./route";

function upload(name: string, text: string) {
  const form = new FormData();
  form.set("file", new File([text], name));
  return new Request("http://localhost/api/import", { method: "POST", body: form });
}

describe("import upload endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SECRET_KEY = "test-key";
    mocks.authorizedRole.mockResolvedValue({ role: "admin", user: { id: "user-1" } });
    mocks.rowsFromUpload.mockResolvedValue([]);
    mocks.runImport.mockResolvedValue({ dryRun: true });
    mocks.runJsonImport.mockResolvedValue({ dryRun: true });
  });

  it("rejects non-admins before reading a file", async () => {
    mocks.authorizedRole.mockResolvedValue({ role: "member", user: { id: "user-1" } });
    const response = await POST(upload("data.json", "{}"));
    expect(response.status).toBe(403);
    expect(mocks.runJsonImport).not.toHaveBeenCalled();
  });

  it("requires the server key and enforces the upload size limit", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    expect((await POST(upload("data.json", "{}"))).status).toBe(503);
    process.env.SUPABASE_SECRET_KEY = "test-key";
    const form = new FormData();
    form.set("file", new File([new Uint8Array(5_000_001)], "large.json"));
    expect((await POST(new Request("http://localhost/api/import", { method: "POST", body: form }))).status).toBe(413);
  });

  it("routes versioned JSON uploads to the JSON importer and forwards preview mode", async () => {
    const payload = JSON.stringify({ format: "rmaiig-robots-import/v1", vendors: [{ name: "Example" }] });
    const response = await POST(upload("DATA.JSON", payload));
    expect(response.status).toBe(200);
    expect(mocks.runJsonImport).toHaveBeenCalledWith(expect.objectContaining({ vendors: [expect.objectContaining({ name: "Example" })] }), "DATA.JSON", true, "user-1");
    expect(mocks.rowsFromUpload).not.toHaveBeenCalled();
  });

  it("routes CSV uploads through the legacy importer and forwards commit mode", async () => {
    const form = new FormData();
    form.set("file", new File(["legacy"], "vendors.csv"));
    form.set("dry_run", "false");
    const response = await POST(new Request("http://localhost/api/import", { method: "POST", body: form }));
    expect(response.status).toBe(200);
    expect(mocks.rowsFromUpload).toHaveBeenCalledWith("vendors.csv", expect.any(Buffer));
    expect(mocks.runImport).toHaveBeenCalledWith([], "vendors.csv", false, "user-1");
  });

  it("returns validation errors from invalid JSON uploads", async () => {
    const response = await POST(upload("invalid.json", "{"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON file" });
  });
});
