import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizedRole: vi.fn(), adminClient: vi.fn() }));
vi.mock("@/lib/server", () => mocks);

import { GET, PATCH, POST } from "./route";

function query(result: { data?: unknown; error?: unknown }, writes: unknown[] = []) {
  const q: Record<string, unknown> = {};
  for (const method of ["select", "eq", "upsert", "insert", "update", "delete"]) q[method] = (...args: unknown[]) => { if (["upsert", "insert", "update", "delete"].includes(method)) writes.push([method, ...args]); return q; };
  q.maybeSingle = async () => result;
  q.single = async () => result;
  q.then = (resolve: (value: typeof result) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return q;
}

const request = (method: string, body?: unknown) => new Request("http://localhost/api/members", { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }) });

describe("workspace member endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizedRole.mockResolvedValue({ role: "admin", user: { id: "admin-1" } });
    mocks.adminClient.mockReturnValue({
      auth: { admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        createUser: async () => ({ data: { user: { id: "new-user", email: "new@example.com", email_confirmed_at: "now" } }, error: null }),
        updateUserById: async () => ({ data: { user: { id: "new-user" } }, error: null }),
      } },
      from: () => query({ data: null, error: null }),
    });
  });

  it("restricts member listing and provisioning to admins", async () => {
    mocks.authorizedRole.mockResolvedValue({ role: "member", user: { id: "member-1" } });
    expect((await GET()).status).toBe(403);
    expect((await POST(request("POST", { email: "new@example.com", first_name: "New", last_name: "Person", role: "member" }))).status).toBe(403);
  });

  it("rejects incomplete provisioning details", async () => {
    const response = await POST(request("POST", { email: "bad", role: "owner" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Enter a valid email, first and last name, and role" });
  });

  it("creates and confirms a user, saves their profile, and assigns the requested role", async () => {
    const writes: unknown[] = [];
    mocks.adminClient.mockReturnValue({
      auth: { admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        createUser: async (args: unknown) => ({ data: { user: { id: "new-user", email: "new@example.com", email_confirmed_at: "now", args } }, error: null }),
        updateUserById: async () => ({ data: { user: { id: "new-user" } }, error: null }),
      } },
      from: () => query({ data: null, error: null }, writes),
    });
    const response = await POST(request("POST", { email: "New@Example.com", first_name: "Ada", last_name: "Lovelace", role: "viewer" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user_id: "new-user", role: "viewer" });
    expect(writes).toEqual(expect.arrayContaining([
      ["upsert", expect.objectContaining({ id: "new-user", first_name: "Ada", last_name: "Lovelace", display_name: "Ada Lovelace" })],
      ["upsert", expect.objectContaining({ user_id: "new-user", role: "viewer" }), { onConflict: "workspace_id,user_id" }],
    ]));
  });

  it("requires the target user to already be a member before changing their name", async () => {
    const response = await PATCH(request("PATCH", { user_id: "00000000-0000-4000-8000-000000000001", first_name: "Ada", last_name: "Lovelace" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Workspace member not found" });
  });
});
