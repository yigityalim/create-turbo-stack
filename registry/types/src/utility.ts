/** Nominal/branded primitive, e.g. `Brand<string, "UserId">`. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Flatten an intersection so editor hovers show a clean object. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type Maybe<T> = T | null | undefined;
export type Nullable<T> = T | null;
export type Awaitable<T> = T | Promise<T>;
export type ValueOf<T> = T[keyof T];

/** Recursively make every property optional. */
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/** Make selected keys required. */
export type RequireKeys<T, K extends keyof T> = Prettify<T & { [P in K]-?: T[P] }>;

/** Make selected keys optional. */
export type OptionalKeys<T, K extends keyof T> = Prettify<Omit<T, K> & { [P in K]?: T[P] }>;
