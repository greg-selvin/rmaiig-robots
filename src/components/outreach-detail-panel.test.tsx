import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OutreachDetailsPanel } from "./outreach-detail-panel";

const actions = { notes: [], emailTemplates: [], canEdit: true, canManageNote: vi.fn(() => true), onAddNote: vi.fn(), onEditNote: vi.fn(), onDeleteNote: vi.fn(), onClose: vi.fn(), onSelect: vi.fn() };

describe("OutreachDetailsPanel", () => {
  it("shows vendor profile details and linked robots in the panel", () => {
    const html = renderToStaticMarkup(createElement(OutreachDetailsPanel, {
      selection: { kind: "vendor", id: "vendor-1" },
      vendor: { id: "vendor-1", name: "Example Robotics", description: "Vendor summary", research_status: "verified" },
      robots: [{ id: "robot-1", name: "Example Bot", vendor_id: "vendor-1" }],
      contacts: [{ id: "contact-1", name: "A. Contact", vendor_id: "vendor-1", business_email: "a@example.com" }],
      locations: [],
      sources: [],
      ...actions,
    }));
    expect(html).toContain('aria-labelledby="outreach-detail-title"');
    expect(html).toContain("Example Robotics");
    expect(html).toContain("Vendor summary");
    expect(html).toContain("Organization notes");
    expect(html).toContain("Add a note");
    expect(html).toContain("Example Bot");
    expect(html).toContain("a@example.com");
    expect(html).toContain("Open full vendor profile");
    expect(html).toContain("↗");
    expect(html).toContain("/?view=vendor&amp;id=vendor-1");
  });

  it("shows robot details and its vendor", () => {
    const html = renderToStaticMarkup(createElement(OutreachDetailsPanel, {
      selection: { kind: "robot", id: "robot-1" },
      vendor: { id: "vendor-1", name: "Example Robotics" },
      robot: { id: "robot-1", name: "Example Bot", vendor_id: "vendor-1", mobility: "Wheeled", manipulation: "Two arms", description: "Robot summary" },
      robots: [],
      contacts: [],
      locations: [],
      sources: [],
      ...actions,
    }));
    expect(html).toContain("Robot details");
    expect(html).toContain("Example Bot");
    expect(html).toContain("Robot summary");
    expect(html).toContain("Wheeled");
    expect(html).toContain("Example Robotics");
    expect(html).toContain("Open full robot profile");
  });
});
