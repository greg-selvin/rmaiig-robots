import { describe, expect, it } from "vitest";
import { organizationRoles, hasOrganizationRole, hasDeploymentRole, usesDeploymentOutreach, matchesOrganization } from "./organizations";

describe("organization identity and ecosystem roles", () => {
  it("preserves legacy Vendor and combined DI semantics", () => {
    expect(organizationRoles({entity_type:"vendor"})).toEqual(["vendor"]);
    expect(organizationRoles({entity_type:"distributor_integrator"})).toEqual(["distributor","integrator"]);
  });
  it("accepts zero roles without falling back to the obsolete category", () => {
    expect(organizationRoles({entity_type:"vendor",roles:[]})).toEqual([]);
    expect(hasOrganizationRole({roles:[]},"vendor")).toBe(false);
  });
  it("filters identity separately from any role in a multiple-role organization", () => {
    const university={organization_type:"university",roles:["research_partner","customer","sponsor"]};
    expect(matchesOrganization(university,"university","sponsor")).toBe(true);
    expect(matchesOrganization(university,"company","sponsor")).toBe(false);
    expect(matchesOrganization(university,"university","vendor")).toBe(false);
    expect(matchesOrganization(university,"","customer")).toBe(true);
    expect(matchesOrganization(university,"university","")).toBe(true);
  });
  it("keeps Vendor outreach and deployment functions available together", () => {
    const hybrid={organization_type:"company",roles:["vendor","integrator"]};
    expect(hasOrganizationRole(hybrid,"vendor")).toBe(true);
    expect(hasDeploymentRole(hybrid)).toBe(true);
    expect(matchesOrganization(hybrid,"company","integrator")).toBe(true);
    expect(usesDeploymentOutreach(hybrid)).toBe(false);
    expect(usesDeploymentOutreach({roles:["integrator"]})).toBe(true);
  });
  it("supports additional lookup values without changing domain code", () => {
    expect(matchesOrganization({organization_type:"laboratory",roles:["educator"]},"laboratory","educator")).toBe(true);
  });
});
