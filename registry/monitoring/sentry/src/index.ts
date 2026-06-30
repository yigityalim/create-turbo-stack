import { env } from "{{scope}}/env";
import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry. Call once at server/process startup — ideally as the
 * first import of your entry file so instrumentation wraps everything else.
 */
export function initMonitoring(): void {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

export { Sentry };
