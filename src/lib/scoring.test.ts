import { describe, expect, it } from "vitest";
import { calculateScore, effectiveRating, priorityScore, topVendorOpportunity, validateWeights } from "./scoring";

const criteria=[{criterion_key:"impact",weight:60},{criterion_key:"interaction",weight:40}];
describe("scoring",()=>{
  it("validates an exact 100 percent total",()=>{expect(validateWeights(criteria)).toBe(true);expect(validateWeights([{criterion_key:"x",weight:99}])).toBe(false);});
  it("uses manual overrides and restores AI when cleared",()=>{expect(effectiveRating({criterion_key:"impact",ai_rating:2,manual_rating:5})).toBe(5);expect(effectiveRating({criterion_key:"impact",ai_rating:2,manual_rating:null})).toBe(2);});
  it("does not turn missing ratings into zero",()=>{expect(calculateScore(criteria,[])).toEqual({score:null,coverage:0,eligible:false,provisional:true});});
  it("normalizes available ratings and reports coverage",()=>{expect(calculateScore(criteria,[{criterion_key:"impact",ai_rating:4,manual_rating:null}])).toEqual({score:80,coverage:60,eligible:true,provisional:false});});
  it("recalculates when weights change without changing ratings",()=>{const ratings=[{criterion_key:"impact",ai_rating:5,manual_rating:null},{criterion_key:"interaction",ai_rating:1,manual_rating:null}];expect(calculateScore(criteria,ratings).score).toBe(68);expect(calculateScore([{criterion_key:"impact",weight:20},{criterion_key:"interaction",weight:80}],ratings).score).toBe(36);});
  it("requires coverage of both components before priority",()=>{const a=calculateScore(criteria,[{criterion_key:"impact",ai_rating:4,manual_rating:null}]);const b=calculateScore(criteria,[]);expect(priorityScore(a,b)).toBeNull();expect(priorityScore(a,a)).toBe(64);});
  it("ranks each vendor by its best opportunity",()=>{expect(topVendorOpportunity([{vendor_id:"a",priority_score:40},{vendor_id:"a",priority_score:70},{vendor_id:"b",priority_score:50}]).map(x=>x.priority_score)).toEqual([70,50]);});
});
