export function ratingImportFields<T extends Record<string, unknown>>(rating: T) {
  const fields = { ...rating };
  const source_urls = fields.source_urls as string[] | undefined;
  delete fields.source_urls;
  delete fields.meetup_id;
  delete fields.meetup_name;
  return { fields, source_urls };
}
