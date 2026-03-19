/**
 * Preset event system — analytics-ready, decoupled from UI.
 *
 * Every meaningful user action emits an event through the bus.
 * In v1 we log to console in dev; in v4 this plugs into PostHog / Mixpanel / custom.
 */

export type PresetEventMap = {
  /** A field in the preset was changed */
  "preset:field-change": {
    path: string; // e.g. "database.strategy", "apps.0.type"
    from: unknown;
    to: unknown;
  };
  /** An app was added */
  "preset:app-add": { name: string; type: string };
  /** An app was removed */
  "preset:app-remove": { name: string };
  /** A package was added */
  "preset:package-add": { name: string; type: string };
  /** A package was removed */
  "preset:package-remove": { name: string };
  /** A preset was loaded (from URL, localStorage, or built-in) */
  "preset:load": {
    source: "url" | "storage" | "builtin" | "file";
    presetName?: string;
  };
  /** Preset was shared */
  "preset:share": { method: "url" | "json" | "clipboard" };
  /** Preset was reset to defaults */
  "preset:reset": Record<string, never>;
  /** File was selected in preview */
  "preview:file-select": { path: string };
  /** Validation error occurred */
  "preset:validation-error": { errors: string[] };
};

export type PresetEvent = keyof PresetEventMap;

type Listener<E extends PresetEvent> = (data: PresetEventMap[E]) => void;

type ListenerMap = {
  [E in PresetEvent]?: Set<Listener<E>>;
};

export function createEventBus() {
  const listeners: ListenerMap = {};

  function on<E extends PresetEvent>(event: E, listener: Listener<E>) {
    if (!listeners[event]) {
      (listeners as Record<E, Set<Listener<E>>>)[event] = new Set();
    }
    (listeners[event] as Set<Listener<E>>).add(listener);
    return () => {
      (listeners[event] as Set<Listener<E>>).delete(listener);
    };
  }

  function emit<E extends PresetEvent>(event: E, data: PresetEventMap[E]) {
    const set = listeners[event] as Set<Listener<E>> | undefined;
    if (set) {
      for (const fn of set) {
        fn(data);
      }
    }
  }

  function clear() {
    for (const key of Object.keys(listeners) as PresetEvent[]) {
      delete listeners[key];
    }
  }

  return { on, emit, clear };
}

export type EventBus = ReturnType<typeof createEventBus>;
