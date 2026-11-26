"use client";

import { useState } from "react";
import { exportCategories, exportCategoryKeys, type ExportCategory } from "@/lib/hubspot-export-options";

export function HubspotExportControls({ stages }: { stages: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<ExportCategory[]>([...exportCategoryKeys]);
  const [pipeline, setPipeline] = useState("Sales Pipeline");
  const [defaultStage, setDefaultStage] = useState("Appointment scheduled");
  const [stageMapping, setStageMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  function toggle(key: ExportCategory) {
    setSelected(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
    setFeedback(null);
  }

  async function download() {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/export/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selected, pipeline, defaultStage, stageMapping: Object.fromEntries(Object.entries(stageMapping).filter(([, stage]) => stage.trim())) }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Could not create the export. Please try again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "rmaiig-hubspot.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setFeedback({ text: "ZIP download started. Open START-HERE.txt for property setup and import order, and review reports/exceptions.csv." });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Export failed", error: true });
    } finally {
      setBusy(false);
    }
  }

  return <div className="card stack hubspot-export">
    <h2>Export to HubSpot</h2>
    <p className="muted">Download import CSVs for a basic HubSpot account, with comments, associations, an import guide, and an original-data archive. Robots and Meetups become readable notes.</p>
    <fieldset disabled={busy} className="export-fieldset">
      <legend>Choose what to export</legend>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => { setSelected([...exportCategoryKeys]); setFeedback(null); }}>Select all</button>
        <button type="button" className="button" onClick={() => { setSelected([]); setFeedback(null); }}>Clear selection</button>
      </div>
      <div className="export-options">{exportCategories.map(category => <label key={category.key} className="export-option">
        <input type="checkbox" checked={selected.includes(category.key)} onChange={() => toggle(category.key)} />
        <span><strong>{category.label}</strong><small>{category.detail}</small></span>
      </label>)}</div>
      <p className="muted">Organizations are included automatically when needed for associations. Contacts without a valid unique email are preserved as company notes and listed in the exceptions report.</p>
      {selected.includes("outreach") && <details className="export-mapping" open>
        <summary>HubSpot pipeline and stages</summary>
        <p className="muted">Enter names exactly as they appear in your HubSpot account. Leave an individual stage blank to use the default. Original stages remain in the exported history.</p>
        <div className="export-options">
          <label className="field">HubSpot pipeline<input className="input" value={pipeline} onChange={event => setPipeline(event.target.value)} required /></label>
          <label className="field">Default HubSpot stage<input className="input" value={defaultStage} onChange={event => setDefaultStage(event.target.value)} required /></label>
          {stages.map(stage => <label className="field" key={stage.id}>{stage.name} → HubSpot stage<input className="input" value={stageMapping[stage.id] || ""} placeholder={defaultStage} onChange={event => setStageMapping(current => ({ ...current, [stage.id]: event.target.value }))} /></label>)}
        </div>
      </details>}
    </fieldset>
    <p className="muted">The ZIP includes a checklist for creating three HubSpot ID properties before import. Import notes and tasks once; importing them again creates duplicates.</p>
    <div className="toolbar"><button type="button" className="button primary" disabled={busy || selected.length === 0 || !pipeline.trim() || !defaultStage.trim()} onClick={download}>{busy ? "Preparing ZIP…" : "Download HubSpot ZIP"}</button><span className="muted" aria-live="polite">{busy ? "Reading all selected records. Keep this page open." : `${selected.length} ${selected.length === 1 ? "category" : "categories"} selected`}</span></div>
    {feedback && <p className={feedback.error ? "notice error" : "notice"} role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
  </div>;
}
