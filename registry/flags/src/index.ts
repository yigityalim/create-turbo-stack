export type FlagValue = boolean | string | number;

/** Resolve a flag from an external source (DB, env, remote). */
export type FlagSource = (key: string) => FlagValue | undefined | Promise<FlagValue | undefined>;

export interface FlagsOptions<T extends Record<string, FlagValue>> {
  /** Default values — the source overrides these when it returns a value. */
  defaults: T;
  source?: FlagSource;
}

/** Widen a literal flag value (e.g. `false` -> `boolean`) — a source may override it. */
type Widen<V> = V extends boolean
  ? boolean
  : V extends number
    ? number
    : V extends string
      ? string
      : V;

export interface Flags<T extends Record<string, FlagValue>> {
  get<K extends keyof T>(key: K): Promise<Widen<T[K]>>;
  isEnabled(key: keyof T): Promise<boolean>;
}

export function createFlags<T extends Record<string, FlagValue>>(
  options: FlagsOptions<T>,
): Flags<T> {
  const get = async <K extends keyof T>(key: K): Promise<Widen<T[K]>> => {
    const fromSource = options.source ? await options.source(String(key)) : undefined;
    return (fromSource ?? options.defaults[key]) as Widen<T[K]>;
  };

  return {
    get,
    isEnabled: async (key) => Boolean(await get(key as keyof T)),
  };
}

/** A source backed by environment variables, e.g. `FLAG_BETA=true`. */
export function envSource(
  prefix = "FLAG_",
  env: Record<string, string | undefined> = process.env,
): FlagSource {
  return (key) => {
    const raw = env[prefix + key.toUpperCase()];
    if (raw === undefined) return undefined;
    if (raw === "true") return true;
    if (raw === "false") return false;
    const asNumber = Number(raw);
    return Number.isNaN(asNumber) ? raw : asNumber;
  };
}
