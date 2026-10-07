import { useState } from "react";
import { classificationLabel, organizationRoles, type ClassificationOption, type OrganizationClassification } from "@/lib/organizations";

export function ClassificationFields({ type, roles, types, roleOptions, onType, onRoles }: { type: string; roles: string[]; types: ClassificationOption[]; roleOptions: ClassificationOption[]; onType: (value: string) => void; onRoles: (value: string[]) => void }) {
  return <div className="stack"><label className="field">Organization Type<select className="select" value={type} onChange={event => onType(event.target.value)}>{types.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label><fieldset className="stack"><legend>Roles</legend><div className="form-grid">{roleOptions.map(option => <label key={option.key}><input type="checkbox" checked={roles.includes(option.key)} onChange={event => onRoles(event.target.checked ? [...roles, option.key] : roles.filter(role => role !== option.key))}/> {option.label}</label>)}</div><p className="muted">Select any number of roles, or leave all unchecked.</p></fieldset></div>;
}

export function OrganizationBadges({ organization, types, roleOptions }: { organization: OrganizationClassification; types: ClassificationOption[]; roleOptions: ClassificationOption[] }) {
  return <div className="toolbar"><span className="badge">{classificationLabel(types, organization.organization_type)}</span>{organizationRoles(organization).map(role => <span className="badge" key={role}>{classificationLabel(roleOptions, role)}</span>)}</div>;
}

export function OrganizationEditor({ organization, types, roleOptions, canEdit, onSave }: { organization: OrganizationClassification & { id: string; name: string; website_url?: string | null; description?: string | null }; types: ClassificationOption[]; roleOptions: ClassificationOption[]; canEdit: boolean; onSave: (values: { name: string; website_url: string | null; description: string | null; organization_type: string; roles: string[] }) => Promise<boolean> }) {
  const [name, setName] = useState(organization.name);
  const [website, setWebsite] = useState(organization.website_url || "");
  const [description, setDescription] = useState(organization.description || "");
  const [type, setType] = useState(organization.organization_type || "company");
  const [roles, setRoles] = useState(organizationRoles(organization));
  const [busy, setBusy] = useState(false);
  return <section className="card stack"><h2>Organization</h2>{canEdit ? <form className="stack" onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); try { await onSave({ name: name.trim(), website_url: website.trim() || null, description: description.trim() || null, organization_type: type, roles }); } finally { setBusy(false); } }}><label className="field">Name<input className="input" required value={name} onChange={event => setName(event.target.value)}/></label><label className="field">Website<input className="input" type="url" value={website} onChange={event => setWebsite(event.target.value)}/></label><label className="field">Description<textarea className="textarea" value={description} onChange={event => setDescription(event.target.value)}/></label><ClassificationFields type={type} roles={roles} types={types} roleOptions={roleOptions} onType={setType} onRoles={setRoles}/><button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save organization"}</button></form> : <OrganizationBadges organization={organization} types={types} roleOptions={roleOptions}/>}</section>;
}
