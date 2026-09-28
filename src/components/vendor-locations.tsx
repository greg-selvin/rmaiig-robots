"use client";

import { useState } from "react";
import { countryLabel, countryRecord, isoCountries, usStateCodes } from "@/lib/geo-codes";

type Location = {
  id: string;
  location_type: string;
  iso_country_code: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  us_state_code: string | null;
  source_url: string | null;
};

type Props = {
  locations: Location[];
  canEdit: boolean;
  onSave: (record: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const locationTypes = ["headquarters", "office", "manufacturing", "research", "other"];
const typeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function VendorLocations({ locations, canEdit, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await onDelete(id);
      setDeleting(null);
      if (editing === id) setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete location");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card stack" aria-label="Locations">
    <div className="toolbar"><h2>Locations</h2>{canEdit && <button className="button" disabled={busy} onClick={() => { setEditing("new"); setDeleting(null); setError(""); }}>Add location</button>}</div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {locations.length ? <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {locations.map(location => <li key={location.id} className="stack" style={{ borderTop: "1px solid #e7eded", paddingTop: 12 }}>
        <div className="toolbar"><strong>{typeLabel(location.location_type || "other")}</strong>{canEdit && <><button className="button" disabled={busy} onClick={() => { setEditing(location.id); setDeleting(null); setError(""); }}>Edit</button><button className="button danger" disabled={busy} onClick={() => { setDeleting(location.id); setError(""); }}>Delete</button></>}</div>
        <p style={{ margin: 0 }}>{[location.city, location.us_state_code || location.region, countryLabel(location.iso_country_code) || location.country].filter(Boolean).join(" · ") || "Location details not recorded"}</p>
        {location.source_url && <a className="source" href={location.source_url} target="_blank" rel="noreferrer">Source ↗</a>}
        {deleting === location.id && <div className="stack"><p>Delete this {typeLabel(location.location_type).toLowerCase()} location?</p><div className="toolbar"><button className="button danger" disabled={busy} onClick={() => void remove(location.id)}>{busy ? "Deleting…" : "Delete location"}</button><button className="button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button></div></div>}
        {editing === location.id && canEdit && <LocationForm key={location.id} location={location} onSave={onSave} onClose={() => setEditing(null)} onBusy={setBusy}/>}
      </li>)}
    </ul> : <p className="muted">No locations recorded yet.</p>}
    {editing === "new" && canEdit && <LocationForm key="new" onSave={onSave} onClose={() => setEditing(null)} onBusy={setBusy}/>}
  </section>;
}

function LocationForm({ location, onSave, onClose, onBusy }: { location?: Location; onSave: Props["onSave"]; onClose: () => void; onBusy: (busy: boolean) => void }) {
  const [kind, setKind] = useState(location?.location_type || "headquarters");
  const [country, setCountry] = useState(location?.iso_country_code || "");
  const [state, setState] = useState(location?.us_state_code || "");
  const [city, setCity] = useState(location?.city || "");
  const [region, setRegion] = useState(location?.region || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const selectedCountry = countryRecord(country);
      await onSave({
        ...(location ? { id: location.id } : {}),
        location_type: kind,
        iso_country_code: selectedCountry?.alpha3 || null,
        country: selectedCountry?.name || null,
        city: city.trim() || null,
        region: country === "USA" ? null : region.trim() || null,
        us_state_code: country === "USA" ? state || null : null,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save location");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return <form className="stack" onSubmit={submit} aria-label={location ? "Edit location" : "Add location"}>
    <h3>{location ? "Edit location" : "Add location"}</h3>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><div className="form-grid">
      <label className="field">Location type<select className="select" value={kind} onChange={event => setKind(event.target.value)}>{[...new Set([...locationTypes, kind])].map(value => <option key={value} value={value}>{typeLabel(value)}</option>)}</select></label>
      <label className="field">Country<select className="select" required value={country} onChange={event => { setCountry(event.target.value); setState(""); setRegion(""); }}><option value="">Choose a country</option>{isoCountries.map(value => <option key={value.alpha3} value={value.alpha3}>{value.alpha3} - {value.name}</option>)}</select></label>
      <label className="field">City<input className="input" value={city} onChange={event => setCity(event.target.value)}/></label>
      {country === "USA" ? <label className="field">State<select className="select" value={state} onChange={event => setState(event.target.value)}><option value="">Unknown state</option>{usStateCodes.map(value => <option key={value.code} value={value.code}>{value.code} - {value.name}</option>)}</select></label> : <label className="field">State / region<input className="input" value={region} onChange={event => setRegion(event.target.value)}/></label>}
    </div></fieldset>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="toolbar"><button className="button primary" disabled={busy}>Save location</button><button type="button" className="button" disabled={busy} onClick={onClose}>Cancel</button></div>
  </form>;
}
