/**
 * Naming convention utilities.
 */

/** Convert a scope string to its name part: "@myorg" → "myorg" */
export function scopeToName(scope: string): string {
  return scope.replace(/^@/, "");
}

/** Build a full package name: ("@myorg", "ui") → "@myorg/ui" */
export function fullPackageName(scope: string, name: string): string {
  return `${scope}/${name}`;
}

/** Slugify a string for use as a package/app name */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
