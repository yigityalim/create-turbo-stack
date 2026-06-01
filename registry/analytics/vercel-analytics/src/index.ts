// Server-side (Route Handlers, Server Actions — Pro/Enterprise)
export type { EventData, ServerTrackOptions } from "./server";
export { trackEvent } from "./server";

// Client-side (browser events)
export { trackClientEvent, inject } from "./client";
export type { BeforeSend, BeforeSendEvent } from "./client";

// React component is at a separate path to keep the core bundle JSX-free:
//   import { Analytics } from "{{scope}}/analytics/react"
