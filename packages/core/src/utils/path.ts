/**
 * Platform-agnostic path utilities.
 * MUST NOT import from Node.js 'path' module.
 */

export function join(...segments: string[]): string {
  return segments.filter(Boolean).join("/").replace(/\/+/g, "/");
}

export function dirname(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

export function basename(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? "";
}

export function relativePath(from: string, to: string): string {
  const fromParts = from.split("/").filter(Boolean);
  const toParts = to.split("/").filter(Boolean);

  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }

  const ups = fromParts.length - common;
  const downs = toParts.slice(common);

  return [...Array(ups).fill(".."), ...downs].join("/");
}
