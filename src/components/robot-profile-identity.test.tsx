import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RobotProfileIdentity } from "./robot-profile-identity";

describe("RobotProfileIdentity", () => {
  it("shows the robot as the profile heading and labels its vendor separately", () => {
    const html = renderToStaticMarkup(createElement(RobotProfileIdentity, { robotName: "R1", vendorName: "Example Robotics", vendorHref: "/?view=vendor&id=v1", researchStatus: "queued" }));

    expect(html).toContain("<h2>R1</h2>");
    expect(html).toContain('<b>Vendor:</b> <a class="link" href="/?view=vendor&amp;id=v1">Example Robotics</a>');
  });
});
