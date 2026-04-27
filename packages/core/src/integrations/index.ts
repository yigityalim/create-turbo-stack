/**
 * Integration registry — central source of truth for which providers
 * contribute catalog deps and env vars. Adding a provider:
 *   1. Append a `defineIntegration` entry to the relevant category file
 *      (auth.ts / database.ts / analytics.ts / ...).
 *   2. Add to the category's exported array.
 *   3. The schema enum for that category must already accept the value.
 *
 * env-chain.ts and catalog.ts query the registry — there is no parallel
 * if-cascade to keep in sync.
 */

import { aiIntegrations } from "./ai";
import { analyticsIntegrations } from "./analytics";
import { apiIntegrations } from "./api";
import { authIntegrations } from "./auth";
import { databaseIntegrations } from "./database";
import { emailIntegrations } from "./email";
import { errorTrackingIntegrations } from "./error-tracking";
import { rateLimitIntegrations } from "./rate-limit";
import { registerIntegration } from "./registry";

const ALL = [
  ...authIntegrations,
  ...databaseIntegrations,
  ...apiIntegrations,
  ...analyticsIntegrations,
  ...errorTrackingIntegrations,
  ...emailIntegrations,
  ...rateLimitIntegrations,
  ...aiIntegrations,
];

for (const def of ALL) registerIntegration(def);

export { getIntegration, listIntegrations, registerIntegration } from "./registry";
export {
  type CatalogEntrySpec,
  defineIntegration,
  type EnvVarSpec,
  type IntegrationCategory,
  type IntegrationDefinition,
} from "./types";
