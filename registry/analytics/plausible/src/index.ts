// Server-side (universal — edge, Node, Deno)
export type { TrackEventOptions, TrackEventResult } from "./server";
export { trackEvent } from "./server";

// Client-side (browser — guarded with typeof globalThis check)
export type { PlausibleScriptProps, ScriptPropsOptions } from "./client";
export { plausibleScriptProps, trackClientEvent } from "./client";
