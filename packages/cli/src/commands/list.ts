import * as p from "@clack/prompts";
import { BUILTIN_REGISTRY_ITEMS, listSupportedAppTypes } from "@create-turbo-stack/core";
import pc from "picocolors";

interface ListOptions {
  json?: boolean;
}

/**
 * `list` — what does this CLI know how to scaffold *right now*?
 *
 * Driven by the bundled registry items: each (slot, variant) pair the engine
 * can serve appears under its slot. Useful when a `create-turbo-stack.json`
 * declares plugins / extra item sources and you want to confirm a third-party
 * provider is actually loaded before starting a prompt session.
 */
export async function listCommand(options: ListOptions = {}): Promise<void> {
  const appTypes = [...listSupportedAppTypes()].sort();

  // Group items by slot. App items repeat across `slot: "app"` and the
  // variant matches an entry in `appTypes`; we still surface them under
  // their slot for parity with the JSON shape.
  const bySlot: Record<string, string[]> = {};
  for (const item of BUILTIN_REGISTRY_ITEMS) {
    if (!item.slot || !item.variant) continue;
    if (!bySlot[item.slot]) bySlot[item.slot] = [];
    bySlot[item.slot].push(item.variant);
  }
  for (const slot of Object.keys(bySlot)) bySlot[slot].sort();

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ appTypes, slots: bySlot }, null, 2)}\n`);
    return;
  }

  p.intro(`${pc.bgCyan(pc.black(" list "))} registered scaffolds`);

  p.log.message(pc.bold("App types"));
  for (const type of appTypes) p.log.message(`  ${pc.cyan(type)}`);

  p.log.message("");
  p.log.message(pc.bold("Registry slots"));
  for (const slot of Object.keys(bySlot).sort()) {
    p.log.message(`  ${pc.dim(slot)}`);
    for (const variant of bySlot[slot]) p.log.message(`    ${pc.cyan(variant)}`);
  }

  p.outro("");
}
