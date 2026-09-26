import { describe, expect, it, vi } from "vitest";
import { saveWorkspaceRecord } from "./workspace-write";

function createDb() {
  const update = vi.fn(() => ({ eq: vi.fn() }));
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ update, insert }));
  return { db: { from } as never, from, update, insert };
}

describe("saveWorkspaceRecord", () => {
  it("updates existing records by id and workspace without invoking insert policy", async () => {
    const { db, from, update, insert } = createDb();
    const query = { eq: vi.fn() };
    query.eq.mockReturnValueOnce(query).mockReturnValueOnce(Promise.resolve({ error: null }));
    update.mockReturnValue(query as never);

    await saveWorkspaceRecord(db, "opportunities", { id: "opp-1", workspace_id: "workspace-other", owner_id: "user-1" }, "workspace-1");

    expect(from).toHaveBeenCalledWith("opportunities");
    expect(update).toHaveBeenCalledWith({ owner_id: "user-1" });
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", "opp-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "workspace_id", "workspace-1");
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts new records with their workspace id", async () => {
    const { db, insert, update } = createDb();

    await saveWorkspaceRecord(db, "contacts", { vendor_id: "vendor-1", name: "Ada" }, "workspace-1");

    expect(insert).toHaveBeenCalledWith({ vendor_id: "vendor-1", name: "Ada", workspace_id: "workspace-1" });
    expect(update).not.toHaveBeenCalled();
  });
});
