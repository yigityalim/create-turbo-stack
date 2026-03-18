import { z } from "zod";

export const DatabaseStrategySchema = z.enum(["supabase", "drizzle", "prisma", "none"]);
export type DatabaseStrategy = z.infer<typeof DatabaseStrategySchema>;

export const DrizzleDriverSchema = z.enum([
  "postgres",
  "mysql",
  "sqlite",
  "turso",
  "neon",
  "planetscale",
]);
export type DrizzleDriver = z.infer<typeof DrizzleDriverSchema>;

export const DatabaseSchema = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("supabase") }),
  z.object({ strategy: z.literal("drizzle"), driver: DrizzleDriverSchema }),
  z.object({ strategy: z.literal("prisma") }),
  z.object({ strategy: z.literal("none") }),
]);
export type Database = z.infer<typeof DatabaseSchema>;
