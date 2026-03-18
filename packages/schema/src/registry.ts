import { z } from "zod";

export const RegistryItemSchema = z.object({
  name: z.string().min(1),
  title: z.string(),
  description: z.string(),
  type: z.literal("registry:preset"),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  preset: z.string().url(),
});

export type RegistryItem = z.infer<typeof RegistryItemSchema>;

export const RegistrySchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1),
  homepage: z.string().url().optional(),
  items: z.array(RegistryItemSchema),
});

export type Registry = z.infer<typeof RegistrySchema>;
