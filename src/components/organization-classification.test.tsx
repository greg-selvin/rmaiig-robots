import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClassificationFields, OrganizationBadges } from "./organization-classification";
const types=[{key:"company",label:"Company"},{key:"university",label:"University"}];
const roleOptions=[{key:"vendor",label:"Vendor"},{key:"integrator",label:"Integrator"},{key:"sponsor",label:"Sponsor"}];
describe("organization classification UI",()=>{
  it("renders one identity select and independent role checkboxes",()=>{
    const html=renderToStaticMarkup(<ClassificationFields type="university" roles={["integrator","sponsor"]} types={types} roleOptions={roleOptions} onType={()=>{}} onRoles={()=>{}}/>);
    expect(html).toContain('value="university" selected=""');
    expect(html.match(/checked=""/g)).toHaveLength(2);
    expect(html).toContain("Organization Type");
    expect(html).not.toContain('type="radio"');
  });
  it("shows all roles alongside the identity",()=>{
    const html=renderToStaticMarkup(<OrganizationBadges organization={{organization_type:"company",roles:["vendor","integrator"]}} types={types} roleOptions={roleOptions}/>);
    expect(html).toContain("Company");expect(html).toContain("Vendor");expect(html).toContain("Integrator");
  });
});
