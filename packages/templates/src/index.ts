// @create-turbo-stack/templates
// Template strings organized by category.
// In Phase 1, templates will be populated via a build script that reads .ejs files.

/** Template map: "category/type" → { "filename.ejs": templateString } */
export const templates: Record<string, Record<string, string>> = {};

/** Get templates for a given category and type. */
export function getTemplates(
  category: string,
  type: string,
): Record<string, string> {
  const key = `${category}/${type}`;
  return templates[key] ?? {};
}
