import Bugsnag from "@bugsnag/js";
import { env } from "{{scope}}/env";

/** Initialize Bugsnag. Call once at server/process startup. */
export function initMonitoring(): void {
  Bugsnag.start({ apiKey: env.BUGSNAG_API_KEY });
}

export { Bugsnag };
