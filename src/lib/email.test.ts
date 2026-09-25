import { describe,expect,it } from "vitest";
import { renderEmail } from "./email";
describe("email drafts",()=>{it("fills fields without logging a send",()=>{expect(renderEmail("Hello {{contact_first_name}} from {{vendor_name}}",{contact_first_name:"Ada",vendor_name:"Acme"})).toEqual({rendered:"Hello Ada from Acme",unresolved:[]});});it("warns for unresolved placeholders",()=>{expect(renderEmail("{{contact_name}} / {{meetup_date}}",{}).unresolved).toEqual(["contact_name","meetup_date"]);});});
