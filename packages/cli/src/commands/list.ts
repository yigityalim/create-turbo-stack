import * as p from "@clack/prompts";
import { listIntegrations, listSupportedAppTypes } from "@create-turbo-stack/core";
import pc from "picocolors";

interface ListOptions {
  json?: boolean;
}

/**
 * `list` — what does this CLI know how to scaffold *right now*?
 *
 * Driven entirely by the registries (built-in + plugin-registered).
 * Useful when a `create-turbo-stack.json` declares plugins and you
 * want to confirm a third-party app type or provider is actually
 * loaded before starting a prompt session.
 */
export async function listCommand(options: ListOptions = {}): Promise<void> {
  const appTypes = [...listSupportedAppTypes()].sort();
  const integrations = listIntegrations();

  const byCategory: Record<string, string[]> = {};
  for (const def of integrations) {
    if (!byCategory[def.category]) byCategory[def.category] = [];
    byCategory[def.category].push(def.provider);
  }
  for (const cat of Object.keys(byCategory)) byCategory[cat].sort();

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ appTypes, integrations: byCategory }, null, 2)}\n`);
    return;
  }

  p.intro(`${pc.bgCyan(pc.black(" list "))} registered scaffolds`);

  p.log.message(pc.bold("App types"));
  for (const type of appTypes) p.log.message(`  ${pc.cyan(type)}`);

  p.log.message("");
  p.log.message(pc.bold("Integrations"));
  for (const cat of Object.keys(byCategory).sort()) {
    p.log.message(`  ${pc.dim(cat)}`);
    for (const provider of byCategory[cat]) p.log.message(`    ${pc.cyan(provider)}`);
  }

  p.outro("");
}
