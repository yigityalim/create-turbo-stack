// @create-turbo-stack/templates
// Template strings organized by category, generated from .eta files.

import { templates } from "./templates-map";

export { templates };

/** Get templates for a given category and type. */
export function getTemplates(category: string, type?: string): Record<string, string> {
  const key = type ? `${category}/${type}` : category;
  return templates[key] ?? {};
}

/** Get a single template by its full key path. */
export function getTemplate(category: string, type: string, file: string): string | undefined {
  const group = getTemplates(category, type);
  return group[file];
}

/** List all available template categories. */
export function listCategories(): string[] {
  return Object.keys(templates);
}
