export type OrganizationClassification = { organization_type?: string; roles?: string[]; entity_type?: string };
export type ClassificationOption = { key: string; label: string; position?: number };

export function organizationRoles(organization: OrganizationClassification | undefined): string[] {
  if (!organization) return [];
  if (organization.roles) return organization.roles;
  return organization.entity_type === "distributor_integrator" ? ["distributor", "integrator"] : organization.entity_type === "vendor" ? ["vendor"] : [];
}

export function hasOrganizationRole(organization: OrganizationClassification | undefined, role: string) {
  return organizationRoles(organization).includes(role);
}

export function hasDeploymentRole(organization: OrganizationClassification | undefined) {
  return hasOrganizationRole(organization, "distributor") || hasOrganizationRole(organization, "integrator");
}

export function usesDeploymentOutreach(organization: OrganizationClassification | undefined) {
  return hasDeploymentRole(organization) && !hasOrganizationRole(organization, "vendor");
}

export function matchesOrganization(organization: OrganizationClassification, type: string, role: string) {
  return (!type || organization.organization_type === type) && (!role || hasOrganizationRole(organization, role));
}

export function classificationLabel(options: ClassificationOption[], key: string | undefined) {
  return options.find(option => option.key === key)?.label || key || "Unknown";
}
