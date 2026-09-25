export const mergeFields = ["contact_first_name","contact_name","vendor_name","robot_name","meetup_name","meetup_date","venue","city","sender_name","sender_role","custom_note"] as const;
export function renderEmail(template: string, values: Partial<Record<(typeof mergeFields)[number], string>>) {
  const rendered = template.replace(/{{\s*([a-z_]+)\s*}}/g, (full, key: string) => values[key as keyof typeof values] ?? full);
  const unresolved = [...new Set([...rendered.matchAll(/{{\s*([a-z_]+)\s*}}/g)].map((match) => match[1]))];
  return { rendered, unresolved };
}
