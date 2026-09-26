import { describe, expect, it } from "vitest";
import { sortDirectoryRows } from "./directory-sort";

describe("sortDirectoryRows", () => {
  it("sorts names case-insensitively and preserves the input array", () => {
    const rows = [{ name: "Vendor 10" }, { name: "vendor 2" }, { name: "Alpha" }];

    expect(sortDirectoryRows(rows, row => row.name, "ascending").map(row => row.name)).toEqual(["Alpha", "vendor 2", "Vendor 10"]);
    expect(sortDirectoryRows(rows, row => row.name, "descending").map(row => row.name)).toEqual(["Vendor 10", "vendor 2", "Alpha"]);
    expect(rows.map(row => row.name)).toEqual(["Vendor 10", "vendor 2", "Alpha"]);
  });
});
