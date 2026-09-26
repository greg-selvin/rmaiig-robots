import { describe, expect, it } from "vitest";
import { newestFirstNotes } from "./record-notes";

describe("newestFirstNotes", () => {
  it("orders notes newest first without changing the input array", () => {
    const notes = [
      { id: "old", created_at: "2026-01-01T10:00:00.000Z" },
      { id: "new", created_at: "2026-02-01T10:00:00.000Z" },
    ];

    expect(newestFirstNotes(notes).map(note => note.id)).toEqual(["new", "old"]);
    expect(notes.map(note => note.id)).toEqual(["old", "new"]);
  });

  it("uses descending ids to keep equal timestamps deterministic", () => {
    expect(newestFirstNotes([
      { id: "a", created_at: "2026-01-01T10:00:00.000Z" },
      { id: "b", created_at: "2026-01-01T10:00:00.000Z" },
    ]).map(note => note.id)).toEqual(["b", "a"]);
  });
});
