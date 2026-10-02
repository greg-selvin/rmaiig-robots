import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RecordNotes } from "./record-notes";
import type { RecordNote } from "@/lib/record-notes";

const note = (id: string, body: string, createdAt: string, author: string, interactionType: RecordNote["interaction_type"] = "note", followUpDate: string | null = null): RecordNote => ({
  id,
  workspace_id: "workspace-1",
  vendor_id: "vendor-1",
  robot_id: null,
  body,
  interaction_type: interactionType,
  follow_up_date: followUpDate,
  created_by: "user-1",
  author_name: author,
  created_at: createdAt,
  updated_at: createdAt,
  is_legacy: false,
});

describe("RecordNotes", () => {
  it("shows timestamped, attributed notes newest first with edit and delete controls", () => {
    const html = renderToStaticMarkup(createElement(RecordNotes, {
      emailTemplates: [{ id: "template-1", name: "Invitation", text: "Subject: Invitation\n\nHello Ada" }],
      notes: [note("old", "Older note", "2026-01-01T10:00:00.000Z", "Ada Lovelace"), note("new", "Newest note", "2026-02-01T10:00:00.000Z", "Grace Hopper", "meeting", "2026-02-10")],
      canEdit: true,
      canManageNote: () => true,
      onAdd: vi.fn(async () => true),
      onEdit: vi.fn(async () => true),
      onDelete: vi.fn(async () => true),
    }));

    expect(html.indexOf("Newest note")).toBeLessThan(html.indexOf("Older note"));
    expect(html).toContain("Grace Hopper");
    expect(html).toContain('dateTime="2026-02-01T10:00:00.000Z"');
    expect(html).toContain("Interaction type");
    expect(html.indexOf("Interaction type")).toBeLessThan(html.indexOf("Add a note"));
    expect(html).not.toContain("Invitation Email");
    expect(html).toContain("Copy note");
    expect(html).toContain("Follow-up date");
    expect(html).toContain("meeting");
    expect(html).toContain("Follow up 2026-02-10");
    expect(html).toContain('type="checkbox" aria-label="Mark follow-up for 2026-02-10 done"');
    expect(html).toContain("Edit");
    expect(html).toContain("Delete");
  });

  it("links URLs in displayed notes and leaves punctuation outside the link", () => {
    const html = renderToStaticMarkup(createElement(RecordNotes, {
      notes: [note("note-1", "Read https://example.com/path?x=1&y=2, then http://example.org.", "2026-02-01T10:00:00.000Z", "Grace Hopper")],
      canEdit: false,
      canManageNote: () => false,
      onAdd: vi.fn(async () => true),
      onEdit: vi.fn(async () => true),
      onDelete: vi.fn(async () => true),
    }));

    expect(html).toContain('<a href="https://example.com/path?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">https://example.com/path?x=1&amp;y=2</a>,');
    expect(html).toContain('<a href="http://example.org" target="_blank" rel="noopener noreferrer">http://example.org</a>.');
  });

  it("keeps note mutation controls hidden for notes the user cannot manage", () => {
    const html = renderToStaticMarkup(createElement(RecordNotes, {
      notes: [note("note-1", "Team note", "2026-02-01T10:00:00.000Z", "Grace Hopper")],
      canEdit: true,
      canManageNote: () => false,
      onAdd: vi.fn(async () => true),
      onEdit: vi.fn(async () => true),
      onDelete: vi.fn(async () => true),
    }));

    expect(html).not.toContain("Edit</button>");
    expect(html).not.toContain("Delete</button>");
  });

  it("shows completed follow-ups without an editable checkbox when the user cannot save notes", () => {
    const html = renderToStaticMarkup(createElement(RecordNotes, {
      notes: [{ ...note("note-1", "Completed follow-up", "2026-02-01T10:00:00.000Z", "Grace Hopper", "note", "2026-02-10"), follow_up_completed: true }],
      canEdit: false,
      canManageNote: () => true,
      onAdd: vi.fn(async () => true),
      onEdit: vi.fn(async () => true),
      onDelete: vi.fn(async () => true),
    }));

    expect(html).toContain("Follow up 2026-02-10");
    expect(html).toContain("Done");
    expect(html).not.toContain("type=\"checkbox\"");
  });
});
