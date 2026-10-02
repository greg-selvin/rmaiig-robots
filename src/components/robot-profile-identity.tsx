export function RobotProfileIdentity({ robotName, companies, vendorName, vendorHref, researchStatus }: { robotName: string; companies?: { id: string; name: string; entity_type?: string }[]; vendorName?: string; vendorHref?: string; researchStatus: string }) {
  if (!companies && vendorName && vendorHref) return <><h2>{robotName}</h2><p><b>Vendor:</b> <a className="link" href={vendorHref}>{vendorName}</a> · <span className="badge">{researchStatus}</span></p></>;
  const relatedCompanies = companies || [];
  return <><h2>{robotName}</h2><p><b>Companies:</b> {relatedCompanies.length ? relatedCompanies.map((company, index) => <span key={company.id}>{index > 0 && " · "}<a className="link" href={company.entity_type === "distributor_integrator" ? `/?view=distributor&id=${encodeURIComponent(company.id)}` : `/?view=vendor&id=${encodeURIComponent(company.id)}`}>{company.name}</a></span>) : "None associated"} · <span className="badge">{researchStatus}</span></p></>;
}
