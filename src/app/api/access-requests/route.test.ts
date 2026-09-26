import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizedRole: vi.fn(), adminClient: vi.fn(), userClient: vi.fn() }));
vi.mock("@/lib/server", () => mocks);

import { PATCH, POST } from "./route";

function builder(result: { data?: unknown; error?: unknown }) {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "update", "insert"]) query[method] = () => query;
  query.maybeSingle = async () => result;
  query.single = async () => result;
  query.then = (resolve: (value: typeof result) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return query;
}

const jsonRequest = (body: unknown) => new Request("http://localhost/api/access-requests", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("access request endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminClient.mockReturnValue({ from: () => builder({ data: null, error: null }), rpc: async () => ({ error: null }) });
    mocks.authorizedRole.mockResolvedValue({ role: "member", user: { id: "user-1" } });
    mocks.userClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "person@example.com" } } }) },
      from: () => ({ ...builder({ data: { role: null }, error: null }), maybeSingle: async () => ({ data: null, error: null }) }),
      functions: { invoke: async () => ({ data: { email_sent: true, notification: "sent" }, error: null }) },
    });
  });

  it("requires a signed-in user to create an access request", async () => {
    mocks.userClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns approved immediately for existing workspace members", async () => {
    const memberCheck = vi.fn(async () => ({ data: { role: "member" }, error: null }));
    const memberQuery = builder({ data: null, error: null });
    memberQuery.maybeSingle = memberCheck;
    mocks.userClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "person@example.com" } } }) },
      from: () => memberQuery,
    });
    const response = await POST();
    expect(memberCheck).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "approved", email_sent: false });
  });

  it("requires authentication and validates review decisions", async () => {
    mocks.authorizedRole.mockResolvedValue(null);
    expect((await PATCH(jsonRequest({ decision: "approved" }))).status).toBe(401);
    mocks.authorizedRole.mockResolvedValue({ role: "member", user: { id: "user-1" } });
    expect((await PATCH(jsonRequest({ id: "bad-id", decision: "approved" }))).status).toBe(400);
    const forbidden = await PATCH(jsonRequest({ id: "00000000-0000-4000-8000-000000000001", decision: "approved" }));
    expect(forbidden.status).toBe(403);
  });

  it("saves profile names and lets admins approve or deny requests", async () => {
    let rpcArgs: unknown;
    mocks.adminClient.mockReturnValue({
      from: () => builder({ data: null, error: null }),
      rpc: async (_name: string, args: unknown) => { rpcArgs = args; return { error: null }; },
    });
    expect((await PATCH(jsonRequest({ first_name: " Ada ", last_name: " Lovelace " }))).status).toBe(200);
    mocks.authorizedRole.mockResolvedValue({ role: "admin", user: { id: "admin-1" } });
    const approved = await PATCH(jsonRequest({ id: "00000000-0000-4000-8000-000000000001", decision: "approved" }));
    expect(approved.status).toBe(200);
    expect(rpcArgs).toEqual({ p_request_id: "00000000-0000-4000-8000-000000000001", p_decision: "approved", p_reviewer: "admin-1" });
  });
});
