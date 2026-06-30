import { initTRPC } from "@trpc/server";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/** Root router — extend with your own procedures. */
export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),
});

export type AppRouter = typeof appRouter;
