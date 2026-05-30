/**
 * Placeholder substitution for registry items.
 *
 * Registry items are committed as real `.ts` files (they compile and lint
 * in the registry repo before they're shipped). To make them work inside a
 * user's monorepo — where the scope and package name vary — we substitute a
 * tiny, fixed vocabulary at materialize time.
 *
 * The vocabulary is intentionally small and closed. Adding a new
 * placeholder requires updating this file, the README, and a test. We do
 * NOT support expressions, conditionals, or anything Eta-shaped. Variations
 * → separate registry variants, never branching inside source.
 *
 * Recognised placeholders:
 *
 *   `{{scope}}`          → preset.basics.scope            ("@saas")
 *   `{{pkg-name}}`       → the auto-package short name    ("env", "db")
 *   `{{pkg-import}}`     → `{{scope}}/{{pkg-name}}`       ("@saas/env")
 *   `{{pm-*}}`           → delegated to `substitutePm`    ("bun install", …)
 *
 * Browser-safe — pure string replacement, no Node APIs.
 */

import type { PackageManager } from "@create-turbo-stack/schema";
import { substitutePm } from "../wiring/pm.js";

export interface SubstitutionContext {
  /** The user's npm scope, e.g. `"@saas"`. */
  scope: string;
  /**
   * The package's short name as it appears in the workspace
   * (`"env"`, `"db"`, `"auth"`, …). For app items this is the app's
   * own name from `preset.apps[i].name`.
   */
  pkgName: string;
  /** Selected package manager, for `{{pm-*}}` delegation. */
  pm: PackageManager;
}

/**
 * Substitute all known placeholders in `text` against `ctx`. Returns the
 * text unchanged if no placeholders are present (fast path for binary-ish
 * content that doesn't actually template).
 *
 * Placeholder application order is deliberate:
 *   1. `{{pkg-import}}` first — it expands to `{{scope}}/{{pkg-name}}`,
 *      i.e. it CONTAINS other placeholders. Substitute it before the
 *      ones it references so we don't double-replace.
 *   2. `{{scope}}` and `{{pkg-name}}` next — leaf placeholders.
 *   3. `{{pm-*}}` last — delegated to the PM substituter.
 */
export function substituteRegistryItem(text: string, ctx: SubstitutionContext): string {
  if (!text.includes("{{")) return text;

  // `{{pkg-import}}` contains the other two — expand first so we don't
  // end up replacing `{{scope}}` inside an already-resolved import path.
  const pkgImport = `${ctx.scope}/${ctx.pkgName}`;

  return substitutePm(
    text
      .replace(/\{\{pkg-import\}\}/g, pkgImport)
      .replace(/\{\{scope\}\}/g, ctx.scope)
      .replace(/\{\{pkg-name\}\}/g, ctx.pkgName),
    ctx.pm,
  );
}

/**
 * The closed set of placeholder names this substituter recognises. Useful
 * for tooling (linters, schema validators) that wants to flag unknown
 * `{{...}}` tokens at authoring time.
 */
export const KNOWN_PLACEHOLDERS = [
  "scope",
  "pkg-name",
  "pkg-import",
  "pm",
  "pm-install",
  "pm-add",
  "pm-add-dev",
  "pm-run",
  "pm-exec",
] as const;
export type KnownPlaceholder = (typeof KNOWN_PLACEHOLDERS)[number];
