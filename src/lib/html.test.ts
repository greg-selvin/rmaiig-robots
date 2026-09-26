import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters before interpolating untrusted values", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Plain text 123")).toBe("Plain text 123");
  });
});
