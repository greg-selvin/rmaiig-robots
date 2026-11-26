import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HubspotExportControls } from "./hubspot-export-controls";

describe("HubSpot export controls", () => {
  it("makes every category selectable and explains basic-plan representations", () => {
    const html = renderToStaticMarkup(createElement(HubspotExportControls, { stages: [{ id: "s1", name: "Research" }] }));
    expect(html.match(/type="checkbox"/g)).toHaveLength(10);
    expect(html.match(/checked=""/g)).toHaveLength(10);
    expect(html).toContain("Download HubSpot ZIP");
    expect(html).toContain("Comments and interactions");
    expect(html).toContain("Clear selection");
    expect(html).toContain("Research → HubSpot stage");
    expect(html).toContain("Robots and Meetups become readable notes");
    expect(html).toContain("Import notes and tasks once");
  });
});
