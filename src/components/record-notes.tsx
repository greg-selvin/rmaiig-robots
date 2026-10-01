"use client";

import { useState, type FormEvent } from "react";
import { newestFirstNotes, type RecordNote } from "@/lib/record-notes";

function linkedNoteBody(body: string) {
  return body.split(/(https?:\/\/[^\s<>]+)/g).flatMap((part, index) => {
    if (!/^https?:\/\//i.test(part)) return part;
    const url = part.replace(/[.,;:!?]+$/, "");
    const trailing = part.slice(url.length);
    return [<a key={index} href={url} target="_blank" rel="noopener noreferrer">{url}</a>, trailing];
  });
}

export type NoteDraft = { body: string; interaction_type: RecordNote["interaction_type"]; follow_up_date: string | null };
export type NoteEmailTemplate = { id: string; name: string; text: string };

export function RecordNotes({ notes, canEdit, canManageNote, onAdd, onEdit, onDelete, emailTemplates = [] }: {
  notes: RecordNote[];
  emailTemplates?: NoteEmailTemplate[];
  canEdit: boolean;
  canManageNote: (note: RecordNote) => boolean;
  onAdd: (note: NoteDraft) => Promise<boolean>;
  onEdit: (noteId: string, note: NoteDraft) => Promise<boolean>;
  onDelete: (noteId: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState("");
  const [interactionType, setInteractionType] = useState<RecordNote["interaction_type"]>("note");
  const [followUpDate, setFollowUpDate] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editInteractionType, setEditInteractionType] = useState<RecordNote["interaction_type"]>("note");
  const [editFollowUpDate, setEditFollowUpDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const orderedNotes = newestFirstNotes(notes);

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      if (await onAdd({ body: body.trim(), interaction_type: interactionType, follow_up_date: followUpDate || null })) { setBody(""); setFollowUpDate(""); setInteractionType("note"); setSelectedTemplateId(""); }
    } finally {
      setBusy(false);
    }
  }

  async function editNote(noteId: string) {
    if (!editBody.trim() || busy) return;
    setBusy(true);
    try {
      if (await onEdit(noteId, { body: editBody.trim(), interaction_type: editInteractionType, follow_up_date: editFollowUpDate || null })) setEditingId("");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (busy || !window.confirm("Delete this note? This cannot be undone.")) return;
    setBusy(true);
    try {
      await onDelete(noteId);
    } finally {
      setBusy(false);
    }
  }

  return <section className="card stack record-notes" aria-labelledby="record-notes-title">
    <h2 id="record-notes-title">Notes</h2>
    {canEdit && <form className="stack" onSubmit={addNote}>
      <label className="field">Interaction type<select className="select" value={interactionType} onChange={event => { const selected = event.target.value as RecordNote["interaction_type"]; setInteractionType(selected); if (selected !== "email") setSelectedTemplateId(""); }}><option value="note">Note</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option></select></label>
      {interactionType === "email" && <label className="field">Email template<select className="select" aria-label="Email template" value={selectedTemplateId} onChange={event => { const templateId = event.target.value; setSelectedTemplateId(templateId); const template = emailTemplates.find(item => item.id === templateId); if (template) setBody(template.text); }}><option value="">Choose email template</option>{emailTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>}
      <div className="record-note-compose-heading"><label className="field" htmlFor="new-record-note">Add a note</label><button className="button" type="button" disabled={!body} onClick={async () => { try { await navigator.clipboard.writeText(body); setCopyStatus("Note copied"); } catch { setCopyStatus("Could not copy note"); } }}>Copy note</button></div>
      <textarea id="new-record-note" className="textarea" value={body} onChange={event => setBody(event.target.value)} required/>
      {copyStatus && <span role="status" className="muted">{copyStatus}</span>}
      <label className="field">Follow-up date<input className="input" type="date" value={followUpDate} onChange={event => setFollowUpDate(event.target.value)}/></label>
      <button className="button primary" disabled={busy || !body.trim()}>Add note</button>
    </form>}
    {!orderedNotes.length ? <p className="muted">No notes yet.</p> : <ol className="record-note-list">
      {orderedNotes.map(note => <li key={note.id} className="record-note">
        <div className="record-note-meta"><strong>{note.author_name}</strong><time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString()}</time>{note.is_legacy && <span className="muted">Existing note; original author and date unavailable</span>}</div>
        <div className="record-note-meta"><span className="badge">{note.interaction_type}</span>{note.follow_up_date && <span className={note.follow_up_date < new Date().toISOString().slice(0, 10) ? "badge danger" : "badge"}>Follow up {note.follow_up_date}</span>}</div>
        {editingId === note.id ? <div className="stack">
          <textarea className="textarea" aria-label="Edit note" value={editBody} onChange={event => setEditBody(event.target.value)}/>
          <label className="field">Interaction type<select className="select" value={editInteractionType} onChange={event => setEditInteractionType(event.target.value as RecordNote["interaction_type"])}><option value="note">Note</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option></select></label>
          <label className="field">Follow-up date<input className="input" type="date" value={editFollowUpDate} onChange={event => setEditFollowUpDate(event.target.value)}/></label>
          <div className="toolbar"><button className="button primary" disabled={busy || !editBody.trim()} onClick={() => void editNote(note.id)}>Save note</button><button className="button" disabled={busy} onClick={() => setEditingId("")}>Cancel</button></div>
        </div> : <>
          <p className="record-note-body">{linkedNoteBody(note.body)}</p>
          {canManageNote(note) && <div className="toolbar"><button className="button" disabled={busy} onClick={() => { setEditingId(note.id); setEditBody(note.body); setEditInteractionType(note.interaction_type); setEditFollowUpDate(note.follow_up_date || ""); }}>Edit</button><button className="button danger" disabled={busy} onClick={() => void deleteNote(note.id)}>Delete</button></div>}
        </>}
      </li>)}
    </ol>}
  </section>;
}
