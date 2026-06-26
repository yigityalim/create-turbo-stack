import NextAuth, { type NextAuthResult } from "next-auth";

// Add providers (GitHub, Google, Credentials, …) to the array below.
const result = NextAuth({
  providers: [],
});

// Explicit annotations: NextAuth's inferred return type isn't portable across
// a bun/pnpm symlinked monorepo (TS2742), so name each export via NextAuthResult.
export const handlers: NextAuthResult["handlers"] = result.handlers;
export const auth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
