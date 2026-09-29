"use client";

import { useEffect, useRef } from "react";

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function eligible(control: Control) {
  return control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement && !["file", "password", "hidden", "checkbox", "radio", "submit", "button"].includes(control.type);
}

function draftId(root: HTMLElement, control: Control) {
  const label = control.closest("label")?.textContent?.trim() || "";
  const identity = `${control.tagName}:${control.getAttribute("aria-label") || control.getAttribute("name") || control.getAttribute("placeholder") || label}`;
  const controls = Array.from(root.querySelectorAll<Control>("input, textarea")).filter(element => eligible(element) && `${element.tagName}:${element.getAttribute("aria-label") || element.getAttribute("name") || element.getAttribute("placeholder") || element.closest("label")?.textContent?.trim() || ""}` === identity);
  return `${identity}:${controls.indexOf(control)}`;
}

function restoreValue(control: Control, value: string) {
  if (control.value === value) return;
  if (control instanceof HTMLTextAreaElement) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(control, value);
  } else if (control instanceof HTMLSelectElement) {
    control.value = value;
  } else {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(control, value);
  }
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

export function DraftPersistence({ root, userId, pageKey, notice, error }: { root: React.RefObject<HTMLElement | null>; userId: string; pageKey: string; notice: string; error: string }) {
  const restored = useRef(new WeakSet<Control>());
  const pending = useRef<{ key: string; ids: string[] } | null>(null);
  const currentValues = useRef<Record<string, string>>({});
  const currentKey = useRef("");

  useEffect(() => {
    if (error) pending.current = null;
  }, [error]);

  useEffect(() => {
    if (!notice || !pending.current) return;
    const { key, ids } = pending.current;
    pending.current = null;
    try {
      const values: Record<string, string> = JSON.parse(localStorage.getItem(key) || "{}");
      for (const id of ids) delete values[id];
      if (currentKey.current === key) currentValues.current = values;
      if (Object.keys(values).length) localStorage.setItem(key, JSON.stringify(values));
      else localStorage.removeItem(key);
    } catch {}
  }, [notice]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const key = `rmaiig-form-draft:${userId}:${pageKey}`;
    let values: Record<string, string> = {};
    try { values = JSON.parse(localStorage.getItem(key) || "{}"); } catch { values = {}; }
    currentKey.current = key;
    currentValues.current = values;
    restored.current = new WeakSet<Control>();

    const restore = () => {
      const controls = element.querySelectorAll<Control>("input, textarea");
      controls.forEach(control => {
        if (!eligible(control)) return;
        if (restored.current.has(control)) return;
        restored.current.add(control);
        const id = draftId(element, control);
        if (Object.hasOwn(currentValues.current, id)) restoreValue(control, currentValues.current[id]);
      });
    };
    const save = (event: Event) => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) return;
      if (!element.contains(control) || !eligible(control)) return;
      currentValues.current[draftId(element, control)] = control.value;
      try { localStorage.setItem(key, JSON.stringify(currentValues.current)); } catch {}
    };
    const prepareClear = (event: Event) => {
      const button = (event.target as Element).closest("button");
      if (!button || !/^(Save|Log)\b/i.test(button.textContent?.trim() || "")) return;
      const container = button.closest("form, .card, .section") || element;
      const ids = Array.from(container.querySelectorAll<Control>("input, textarea")).filter(eligible).map(control => draftId(element, control));
      pending.current = { key, ids };
    };
    const observer = new MutationObserver(restore);
    element.addEventListener("input", save);
    element.addEventListener("change", save);
    element.addEventListener("click", prepareClear, true);
    observer.observe(element, { childList: true, subtree: true });
    restore();
    return () => {
      observer.disconnect();
      element.removeEventListener("input", save);
      element.removeEventListener("change", save);
      element.removeEventListener("click", prepareClear, true);
    };
  }, [root, userId, pageKey]);

  return null;
}
