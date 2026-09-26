import { describe, expect, it } from "vitest";
import { ratingImportFields } from "./rating-import";

describe("ratingImportFields", () => {
  it("removes Meetup lookup values and preserves rating and source fields", () => {
    const result = ratingImportFields({ criterion_key: "meetup_fit", ai_rating: 4, meetup_id: "meetup-id", meetup_name: "Boulder Meetup", source_urls: ["https://example.com"] });

    expect(result).toEqual({ fields: { criterion_key: "meetup_fit", ai_rating: 4 }, source_urls: ["https://example.com"] });
  });

  it("keeps missing source URLs omitted", () => {
    expect(ratingImportFields({ criterion_key: "live_impact", ai_rating: 3 })).toEqual({ fields: { criterion_key: "live_impact", ai_rating: 3 }, source_urls: undefined });
  });
});
