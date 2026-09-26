import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScoreAccordion } from "./score-accordion";

describe("ScoreAccordion", () => {
  it("starts collapsed while keeping its score and details available", () => {
    const html = renderToStaticMarkup(createElement(ScoreAccordion, { title: "Meetup excitement", summary: "4.2" }, createElement("p", null, "Scoring details")));

    expect(html).toContain("<details class=\"card score-accordion\"><summary>");
    expect(html).toContain("Meetup excitement");
    expect(html).toContain("Scoring details");
    expect(html).not.toContain(" open");
  });
});
