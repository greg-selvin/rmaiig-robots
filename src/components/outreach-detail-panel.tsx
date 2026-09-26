import { countryLabel } from "@/lib/geo-codes";

export type OutreachDetailSelection = { kind: "vendor" | "robot"; id: string };

type Profile = {
  id: string;
  name?: string;
  vendor_id?: string;
  research_status?: string;
  description?: string | null;
  website_url?: string | null;
  country?: string | null;
  iso_country_code?: string | null;
  us_state_code?: string | null;
  product_url?: string | null;
  mobility?: string | null;
  manipulation?: string | null;
  interaction_capabilities?: string[] | null;
  original_imported_text?: string | null;
  original_robot_text?: string | null;
  source_row?: string | null;
};

type RelatedRecord = { id: string; name?: string | null; vendor_id?: string; robot_id?: string; job_title?: string | null; business_email?: string | null; email_status?: string | null; city?: string | null; region?: string | null; iso_country_code?: string | null; evidence_summary?: string | null; title?: string | null; publisher?: string | null; url?: string | null };

export function OutreachDetailsPanel({ selection, vendor, robot, robots, contacts, locations, sources, onClose, onSelect }: {
  selection: OutreachDetailSelection;
  vendor?: Profile;
  robot?: Profile;
  robots: Profile[];
  contacts: RelatedRecord[];
  locations: RelatedRecord[];
  sources: RelatedRecord[];
  onClose: () => void;
  onSelect: (selection: OutreachDetailSelection) => void;
}) {
  const profile = selection.kind === "vendor" ? vendor : robot;
  if (!profile) return null;
  const vendorName = vendor?.name || "Unknown vendor";
  const vendorId = selection.kind === "vendor" ? profile.id : robot?.vendor_id;
  const relatedRobots = robots.filter(item => item.vendor_id === vendorId);
  const relatedContacts = contacts.filter(item => item.vendor_id === vendorId);
  const relatedLocations = locations.filter(item => item.vendor_id === vendorId);
  const relatedSources = sources.filter(item => selection.kind === "vendor" ? item.vendor_id === profile.id : item.robot_id === robot?.id);

  return <aside className="outreach-detail-panel" aria-labelledby="outreach-detail-title">
    <header className="outreach-detail-header">
      <div>
        <span className="eyebrow">{selection.kind === "vendor" ? "Vendor details" : "Robot details"}</span>
        <h2 id="outreach-detail-title">{profile.name || (selection.kind === "vendor" ? "Unnamed vendor" : "Unnamed robot")}</h2>
      </div>
      <button className="button" type="button" aria-label="Close details panel" onClick={onClose}>Close</button>
    </header>
    <div className="stack outreach-detail-content">
      {selection.kind === "vendor" ? <>
        <div className="record-note-meta"><span className="badge">{vendor?.research_status || "Research status unknown"}</span><span>{countryLabel(vendor?.iso_country_code) || vendor?.country || "Country unknown"}{vendor?.us_state_code ? ` · ${vendor.us_state_code}` : ""}</span></div>
        <p>{vendor?.description || "No vendor description available."}</p>
        {vendor?.source_row && <p><b>Source row:</b> {vendor.source_row}</p>}
        {vendor?.original_robot_text && <p><b>Original robot text:</b> {vendor.original_robot_text}</p>}
        {vendor?.website_url && <a className="link" href={vendor.website_url} target="_blank" rel="noreferrer">Official website ↗</a>}
        <section className="stack"><h3>Robots</h3>{relatedRobots.length ? relatedRobots.map(item => <button className="outreach-detail-link" type="button" key={item.id} onClick={() => onSelect({ kind: "robot", id: item.id })}>{item.name || "Unnamed robot"}</button>) : <p className="muted">No robots listed for this vendor.</p>}</section>
      </> : <>
        <div className="record-note-meta"><span className="badge">{robot?.research_status || "Research status unknown"}</span><button className="outreach-detail-link" type="button" onClick={() => robot?.vendor_id && onSelect({ kind: "vendor", id: robot.vendor_id })}>{vendorName}</button></div>
        <p>{robot?.description || "No robot description available."}</p>
        {robot?.product_url && <a className="link" href={robot.product_url} target="_blank" rel="noreferrer">Product page ↗</a>}
        <p><b>Mobility:</b> {robot?.mobility || "Unknown"}<br/><b>Manipulation:</b> {robot?.manipulation || "Unknown"}</p>
        {robot?.interaction_capabilities?.length ? <p><b>Interaction capabilities:</b> {robot.interaction_capabilities.join(", ")}</p> : null}
        {robot?.original_imported_text && <p><b>Original import:</b> {robot.original_imported_text}</p>}
      </>}
      {relatedLocations.length > 0 && <section className="stack"><h3>Locations</h3>{relatedLocations.map(item => <p key={item.id}>{[item.city, item.region, countryLabel(item.iso_country_code)].filter(Boolean).join(", ")}</p>)}</section>}
      {relatedContacts.length > 0 && <section className="stack"><h3>Contacts</h3>{relatedContacts.map(item => <p key={item.id}><b>{item.name || "General contact"}</b>{item.job_title && <><br/>{item.job_title}</>}{item.business_email && <><br/><a className="link" href={`mailto:${item.business_email}`}>{item.business_email}</a></>}{item.email_status && <><br/><span className="badge">{item.email_status}</span></>}</p>)}</section>}
      {relatedSources.length > 0 && <section className="stack"><h3>Research sources</h3>{relatedSources.map(item => <p key={item.id}>{item.url ? <a className="link" href={item.url} target="_blank" rel="noreferrer">{item.title || item.publisher || item.url} ↗</a> : item.title || item.publisher}{item.evidence_summary && <><br/><span className="muted">{item.evidence_summary}</span></>}</p>)}</section>}
      {selection.kind === "robot" && relatedRobots.length > 1 && <section className="stack"><h3>Other robots from {vendorName}</h3>{relatedRobots.filter(item => item.id !== robot?.id).map(item => <button className="outreach-detail-link" type="button" key={item.id} onClick={() => onSelect({ kind: "robot", id: item.id })}>{item.name || "Unnamed robot"}</button>)}</section>}
      <a className="button outreach-open-profile" href={`/?view=${selection.kind}&id=${encodeURIComponent(profile.id)}`}>Open full {selection.kind} profile</a>
    </div>
  </aside>;
}
