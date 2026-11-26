import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "./database.types";
import { exportWorkspaceId, readExportData } from "./hubspot-export-reader";

function clientFor(input: { total?: number; incomplete?: boolean; error?: boolean; drift?: boolean } = {}) {
  const filters: [string, string, unknown][] = [];
  const pages: [string, number, number][] = [];
  const orders: [string, string][] = [];
  const client = { from(table: string) {
    const query = {
      select() { return query; },
      eq(key: string, value: unknown) { filters.push([table, key, value]); return query; },
      order(key: string) { orders.push([table, key]); return query; },
      async range(start: number, end: number) {
        pages.push([table, start, end]);
        const total = table === "vendors" ? input.total || 0 : 0;
        const length = Math.min(input.incomplete ? 100 : 200, Math.max(0, total - start));
        return { data: Array.from({ length }, (_, index) => ({ id: `v${start + index}`, name: `Company ${start + index}` })), count: total + (input.drift && start ? 1 : 0), error: input.error ? { message: "Database failed" } : null };
      },
      async in() { return { data: [], error: null }; },
    };
    return query;
  } } as unknown as SupabaseClient<Database>;
  return { client, filters, pages, orders };
}

describe("workspace export reader", () => {
  it("reads beyond UI limits and scopes every tenant table", async () => {
    const { client, filters, pages, orders } = clientFor({ total: 1201 });
    const result = await readExportData(client, ["companies"]);
    expect(result.vendors).toHaveLength(1201);
    expect(pages.filter(([table]) => table === "vendors")).toHaveLength(7);
    expect(filters.every(([, key, value]) => key === "workspace_id" && value === exportWorkspaceId)).toBe(true);
    expect(orders).toContainEqual(["organization_roles", "role_key"]);
    expect(orders).toContainEqual(["robot_company_links", "vendor_id"]);
  });

  it("fails instead of generating a partial ZIP when a page is cut short", async () => {
    await expect(readExportData(clientFor({ total: 501, incomplete: true }).client, ["companies"])).rejects.toThrow("incomplete vendors page");
  });

  it("fails when source counts change or a selected table cannot be read", async () => {
    await expect(readExportData(clientFor({ total: 501, drift: true }).client, ["companies"])).rejects.toThrow("changed during export");
    await expect(readExportData(clientFor({ error: true }).client, ["companies"])).rejects.toThrow("Database failed");
  });
});
