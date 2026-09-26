import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportControls } from "./app";

describe("ImportControls file picker", () => {
  it("renders a visible picker button and an explicit drag target", () => {
    const html = renderToStaticMarkup(createElement(ImportControls, { onReload: async () => {}, setError: () => {} }));
    expect(html).toContain('<button class="button primary file-choose-button" type="button">Choose file</button>');
    expect(html).toContain('class="file-drop"');
    expect(html).toContain("Drag a file here");
    expect(html).toContain('accept=".csv,.xlsx,.json"');
    expect(html).toContain('aria-label="Choose import file"');
  });
});
