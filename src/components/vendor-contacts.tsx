"use client";

import { useState, type FormEvent } from "react";

type Contact = {
  id: string;
  name: string | null;
  job_title: string | null;
  department: string | null;
  contact_type: string | null;
  business_email: string | null;
  business_phone: string | null;
  contact_form_url: string | null;
  profile_url: string | null;
  location: string | null;
  notes: string | null;
};

type Props = {
  contacts: Contact[];
  canEdit: boolean;
  onSave: (record: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const contactTypes = ["Company sales rep", "Company product rep", "Distributor", "Company executive", "Company support", "Other"];

export function VendorContacts({ contacts, canEdit, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove(contactId: string) {
    setBusy(true);
    setError("");
    try {
      await onDelete(contactId);
      setDeleting(null);
      setEditing(null);
      if (open === contactId) setOpen(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete contact");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card contact-section" aria-label="Contacts">
    <div className="toolbar"><h2>Contacts</h2>{canEdit && <button className="button primary" disabled={busy} onClick={() => { setEditing("new"); setDeleting(null); setError(""); }}>Add contact</button>}</div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {editing === "new" && <ContactForm key="new" onSave={onSave} onClose={() => setEditing(null)} onBusy={setBusy}/>}
    {contacts.length ? <ul className="contact-list">{contacts.map(contact => <li key={contact.id} className="contact-card">
      <div className="contact-card-summary">
        <button className="contact-card-toggle" type="button" aria-expanded={open === contact.id} onClick={() => setOpen(open === contact.id ? null : contact.id)}>
          <span><strong>{contact.name || contact.department || contact.business_email || "General contact"}</strong><small>{[contact.contact_type, contact.job_title].filter(Boolean).join(" · ") || "Contact details"}</small></span><span aria-hidden="true">{open === contact.id ? "−" : "+"}</span>
        </button>
        {(contact.business_email || contact.business_phone || contact.contact_form_url || contact.profile_url) && <div className="contact-card-basics">
          {contact.business_email && <a className="link" href={`mailto:${contact.business_email}`}>{contact.business_email}</a>}
          {contact.business_phone && <a className="link" href={`tel:${contact.business_phone}`}>{contact.business_phone}</a>}
          {contact.contact_form_url && <a className="link" href={contact.contact_form_url} target="_blank" rel="noreferrer">Contact form ↗</a>}
          {contact.profile_url && <a className="link" href={contact.profile_url} target="_blank" rel="noreferrer">Profile ↗</a>}
        </div>}
      </div>
      {open === contact.id && <div className="contact-card-details">
        {contact.department && <p><b>Department:</b> {contact.department}</p>}
        {contact.location && <p><b>Location:</b> {contact.location}</p>}
        <div><b>Notes</b><p className="contact-notes">{contact.notes || "No notes yet."}</p></div>
        {canEdit && <div className="toolbar"><button className="button" disabled={busy} onClick={() => { setEditing(contact.id); setDeleting(null); }}>Edit contact or notes</button><button className="button danger" disabled={busy} onClick={() => { setDeleting(contact.id); setEditing(null); }}>Delete</button></div>}
        {deleting === contact.id && <div className="stack"><p>Delete {contact.name || "this contact"}? Logged interactions will remain without a linked contact.</p><div className="toolbar"><button className="button danger" disabled={busy} onClick={() => void remove(contact.id)}>{busy ? "Deleting…" : "Delete contact"}</button><button className="button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button></div></div>}
        {editing === contact.id && <ContactForm key={contact.id} contact={contact} onSave={onSave} onClose={() => setEditing(null)} onBusy={setBusy}/>}
      </div>}
    </li>)}</ul> : <p className="muted">No contacts recorded yet.</p>}
  </section>;
}

function ContactForm({ contact, onSave, onClose, onBusy }: { contact?: Contact; onSave: Props["onSave"]; onClose: () => void; onBusy: (busy: boolean) => void }) {
  const [values, setValues] = useState({name: contact?.name || "", job_title: contact?.job_title || "", department: contact?.department || "", contact_type: contact?.contact_type || "", business_email: contact?.business_email || "", business_phone: contact?.business_phone || "", contact_form_url: contact?.contact_form_url || "", profile_url: contact?.profile_url || "", location: contact?.location || "", notes: contact?.notes || ""});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function set(key: keyof typeof values, value: string) { setValues(current => ({...current, [key]: value})); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);onBusy(true);setError("");
    try {
      await onSave({...contact && {id: contact.id}, ...Object.fromEntries(Object.entries(values).map(([key,value]) => [key,value.trim() || null]))});
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save contact");
    } finally {
      setBusy(false);onBusy(false);
    }
  }
  return <form className="stack contact-form" onSubmit={submit} aria-label={contact ? "Edit contact" : "Add contact"}>
    <h3>{contact ? "Edit contact" : "Add contact"}</h3>
    <fieldset disabled={busy} className="contact-fieldset"><div className="form-grid">
      <label className="field">Name<input className="input" value={values.name} onChange={event => set("name",event.target.value)}/></label>
      <label className="field">Contact type<select className="select" value={values.contact_type} onChange={event => set("contact_type",event.target.value)}><option value="">Choose type</option>{[...new Set([...contactTypes, values.contact_type].filter(Boolean))].map(type => <option key={type} value={type}>{type}</option>)}</select></label>
      <label className="field">Job title<input className="input" value={values.job_title} onChange={event => set("job_title",event.target.value)}/></label>
      <label className="field">Department<input className="input" value={values.department} onChange={event => set("department",event.target.value)}/></label>
      <label className="field">Business email<input className="input" type="email" value={values.business_email} onChange={event => set("business_email",event.target.value)}/></label>
      <label className="field">Business phone<input className="input" type="tel" value={values.business_phone} onChange={event => set("business_phone",event.target.value)}/></label>
      <label className="field">Contact form URL<input className="input" type="url" value={values.contact_form_url} onChange={event => set("contact_form_url",event.target.value)}/></label>
      <label className="field">Profile URL<input className="input" type="url" value={values.profile_url} onChange={event => set("profile_url",event.target.value)}/></label>
      <label className="field">Location<input className="input" value={values.location} onChange={event => set("location",event.target.value)}/></label>
    </div><label className="field">Notes<textarea className="textarea" value={values.notes} onChange={event => set("notes",event.target.value)}/></label></fieldset>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="toolbar"><button className="button primary" disabled={busy}>{busy ? "Saving…" : "Save contact"}</button><button type="button" className="button" disabled={busy} onClick={onClose}>Cancel</button></div>
  </form>;
}
