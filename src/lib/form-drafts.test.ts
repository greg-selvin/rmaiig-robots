import { describe, expect, it } from "vitest";
import { clearSavedFormDrafts } from "./form-drafts";

describe("clearSavedFormDrafts", () => {
  it("removes every saved form value and open state for this user while preserving other browser state", () => {
    const entries = new Map([
      ["rmaiig-form-draft:user-1:vendor:one", "old note"],
      ["rmaiig-form-draft:user-1:vendors:", "old organization"],
      ["rmaiig-form-open:user-1:vendors:", "true"],
      ["rmaiig-form-draft:user-2:vendors:", "other user"],
      ["rmaiig-nav-collapsed", "true"],
      ["sb-auth-token", "session"],
    ]);
    clearSavedFormDrafts({ get length() { return entries.size; }, key: index => [...entries.keys()][index] ?? null, removeItem: key => { entries.delete(key); } }, "user-1");
    expect([...entries.keys()]).toEqual(["rmaiig-form-draft:user-2:vendors:", "rmaiig-nav-collapsed", "sb-auth-token"]);
  });

  it("does not prevent forms from opening if browser storage is unavailable", () => {
    expect(() => clearSavedFormDrafts({ get length(): number { throw new Error("Storage blocked"); }, key: () => null, removeItem: () => {} }, "user-1")).not.toThrow();
  });
});
