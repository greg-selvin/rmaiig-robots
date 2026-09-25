import { describe,expect,it } from "vitest";
import { countryCode,normalizeName,parseRobotNames,previewImport } from "./import";
describe("source import",()=>{
  it("normalizes names for idempotent imports",()=>{expect(normalizeName("  Figure-AI ")).toBe("figure ai");const row={source_row:2,source_rank:1,company:"Figure AI",robots:"Figure 02",country:"USA"};expect(previewImport([row,row]).insertedVendors).toBe(1);expect(previewImport([row,row]).insertedRobots).toBe(1);});
  it("keeps ambiguous model lists for manual review",()=>{expect(parseRobotNames("Alice M1, 4, 3, Aimy")).toEqual({names:[],warning:"Ambiguous combined robot names; manual review required"});expect(parseRobotNames("Tiangong/Tien Kung").warning).toBeTruthy();});
  it("accepts blank robots and known country codes",()=>{expect(parseRobotNames("")).toEqual({names:[],warning:null});expect(countryCode("USA")).toBe("US");expect(countryCode("UK")).toBe("GB");expect(countryCode("XYZ")).toBeNull();});
});
