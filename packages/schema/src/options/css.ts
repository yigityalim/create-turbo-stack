import { z } from "zod";

export const CssFrameworkSchema = z.enum([
  "tailwind4",
  "tailwind3",
  "vanilla",
  "css-modules",
]);
export type CssFramework = z.infer<typeof CssFrameworkSchema>;

export const UiLibrarySchema = z.enum(["shadcn", "radix-raw", "none"]);
export type UiLibrary = z.infer<typeof UiLibrarySchema>;

export const StylingArchSchema = z.enum(["css-variables", "static"]);
export type StylingArch = z.infer<typeof StylingArchSchema>;

export const CssSchema = z.object({
  framework: CssFrameworkSchema.default("tailwind4"),
  ui: UiLibrarySchema.default("none"),
  styling: StylingArchSchema.default("css-variables"),
});
export type Css = z.infer<typeof CssSchema>;
