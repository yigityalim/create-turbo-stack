import type { FileTreeNode } from "@create-turbo-stack/schema";
import { getTemplates } from "@create-turbo-stack/templates";
import { renderTemplate } from "./template-engine";

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
  const templates = getTemplates(category);
  const nodes: FileTreeNode[] = [];

  for (const [templateFile, templateContent] of Object.entries(templates)) {
    // Remove .eta extension from output path
    const outputFile = templateFile.replace(/\.eta$/, "");
    const content = renderTemplate(templateContent, context);

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
  const templates = getTemplates(category);
  const template = templates[file];
  if (!template) return undefined;
  return renderTemplate(template, context);
}
