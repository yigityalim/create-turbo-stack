/**
 * Project database types. Replace with your generated types — Supabase's
 * `supabase gen types typescript`, an ORM's inferred types, etc. Until a schema
 * is linked this empty placeholder keeps imports resolving.
 */
export type Database = Record<string, never>;

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
