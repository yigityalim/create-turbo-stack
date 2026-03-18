import { z } from "zod";

export const PackageTypeSchema = z.enum([
  "ui",
  "utils",
  "config",
  "library",
  "react-library",
]);
export type PackageType = z.infer<typeof PackageTypeSchema>;

export const PackageSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
  type: PackageTypeSchema,
  producesCSS: z.boolean().default(false),
  exports: z.array(z.string()).default(["."]),
});
export type Package = z.infer<typeof PackageSchema>;
