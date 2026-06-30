import { z } from "zod";

/** Shared Zod schemas reused across apps and packages. */

export const emailSchema = z.email();
export const uuidSchema = z.uuid();
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case");

export const idSchema = z.object({ id: uuidSchema });
export type Id = z.infer<typeof idSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;
