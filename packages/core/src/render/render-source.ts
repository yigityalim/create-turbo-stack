import type { FileTreeNode } from "@create-turbo-stack/schema";
import { getTemplates as getBuiltInTemplates } from "@create-turbo-stack/templates";
import { renderTemplate } from "./template-engine";
import { getRegisteredTemplates } from "./template-registry";

/**
 * Merge built-in (`.eta` files baked into the templates package) with
 * runtime-registered templates from plugins. Plugin entries override
 * built-ins on key collision so company plugins can swap a single file
 * without forking the whole category.
 */
function resolveCategoryTemplates(category: string): Record<string, string> {
  return {
    ...getBuiltInTemplates(category),
    ...getRegisteredTemplates(category),
  };
}

/**
 * Render all source files from a template category into FileTreeNode[].
 *
 * @param category Template category key (e.g. "db/drizzle", "auth/clerk")
 * @param basePath Output directory (e.g. "packages/db")
 * @param context Template context variables (passed as `it.*` in Eta)
 */
export function renderSourceFiles(
  category: string,
  basePath: string,
  context: Record<string, unknown>,
): FileTreeNode[] {
  const templates = resolveCategoryTemplates(category);
  const nodes: FileTreeNode[] = [];

  for (const [templateFile, templateContent] of Object.entries(templates)) {
    // Remove .eta extension from output path
    const outputFile = templateFile.replace(/\.eta$/, "");
    const content = renderTemplate(templateContent, context);

    // Skip files whose rendered content is empty — lets templates use
    // <% if (cond) { %>...<% } %> to conditionally emit a file.
    if (content.trim() === "") continue;

    nodes.push({
      path: `${basePath}/${outputFile}`,
      content,
      isDirectory: false,
    });
  }

  return nodes;
}

/**
 * Render a single template file.
 *
 * @param category Template category (e.g. "app/nextjs")
 * @param file Template file name (e.g. "src/app/layout.tsx.eta")
 * @param context Template context
 * @returns Rendered content, or undefined if template not found
 */
export function renderSingleFile(
  category: string,
  file: string,
  context: Record<string, unknown>,
): string | undefined {
  const templates = resolveCategoryTemplates(category);
  const template = templates[file];
  if (!template) return undefined;
  return renderTemplate(template, context);
}
