import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizedRole: vi.fn(), readExportData: vi.fn() }));
vi.mock("@/lib/server", () => ({ authorizedRole: mocks.authorizedRole }));
vi.mock("@/lib/hubspot-export-reader", () => ({ readExportData: mocks.readExportData }));
import { POST } from "./route";

function request(body: unknown, origin = "https://rmaiig-robots.vercel.app") {
  return new Request("https://rmaiig-robots.vercel.app/api/export/hubspot", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
}

describe("HubSpot ZIP endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizedRole.mockResolvedValue({ role: "admin", client: {} });
    mocks.readExportData.mockResolvedValue({ vendors: [{ id: "v1", name: "Company" }] });
  });

  it.each([null, { role: "viewer" }, { role: "member" }])("requires an admin for all export categories: %s", async auth => {
    mocks.authorizedRole.mockResolvedValue(auth);
    expect((await POST(request({ categories: ["settings"] }))).status).toBe(403);
    expect(mocks.readExportData).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests and invalid selections before reading data", async () => {
    expect((await POST(request({ categories: ["companies"] }, "https://other.example"))).status).toBe(403);
    expect((await POST(request({ categories: [] }))).status).toBe(400);
    expect((await POST(request({ categories: ["auth.users"] }))).status).toBe(400);
    expect((await POST(request({ categories: ["outreach"], pipeline: " " }))).status).toBe(400);
    expect(mocks.readExportData).not.toHaveBeenCalled();
  });

  it("returns a private downloadable ZIP and forwards the selected categories", async () => {
    const response = await POST(request({ categories: ["comments"] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toMatch(/attachment; filename="rmaiig-hubspot-.*\.zip"/);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(new Uint8Array(await response.arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([80, 75, 3, 4]));
    expect(mocks.readExportData).toHaveBeenCalledWith({}, ["comments"]);
  });

  it("does not return a ZIP when reading fails", async () => {
    mocks.readExportData.mockRejectedValue(new Error("Incomplete source data"));
    const response = await POST(request({ categories: ["companies"] }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Incomplete source data" });
  });
});
