import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ browserClient: () => null }));

import { RobotCreateForm } from "./app";

describe("RobotCreateForm", () => {
  it("offers organizations without vendor roles as associations while keeping ownership valid", () => {
    const html = renderToStaticMarkup(createElement(RobotCreateForm, {
      vendors: [
        { id: "vendor", name: "Robot Maker", roles: ["vendor"] },
        { id: "university", name: "Example University", roles: [] },
        { id: "integrator", name: "Example Integrator", roles: ["integrator"] },
      ],
      onCancel: () => {},
      onCreated: async () => {},
    }));
    const ownership = html.slice(html.indexOf("<select"), html.indexOf("</select>"));
    expect(ownership).toContain("Robot Maker");
    expect(ownership).not.toContain("Example University");
    expect(html).toContain('<span>Example University</span>');
    expect(html).toContain('<span>Example Integrator</span>');
    expect(html).toContain('class="robot-organization-choice"');
    expect(html.indexOf("Save robot")).toBeLessThan(html.indexOf("Also associate with organizations"));
    expect(html).toContain("Search organizations");
  });
});
