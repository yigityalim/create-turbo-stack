import { Eta } from "eta";

const eta = new Eta({ autoEscape: false, autoTrim: false });

/**
 * Render an EJS-compatible template string with the given context.
 * Uses Eta — same syntax as EJS (<%= %>, <% %>) but browser-compatible.
 */
export function renderTemplate(templateString: string, context: Record<string, unknown>): string {
  return eta.renderString(templateString, context);
}
