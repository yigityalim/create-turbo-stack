import fs from "node:fs/promises";
import path from "node:path";
import type { FileTreeNode } from "@create-turbo-stack/schema";

export async function writeFiles(outputDir: string, nodes: FileTreeNode[]): Promise<void> {
  const resolvedDir = path.resolve(outputDir);
  await fs.mkdir(resolvedDir, { recursive: true });

  for (const node of nodes) {
    if (node.isDirectory) continue;

    const fullPath = path.resolve(resolvedDir, node.path);

    // Prevent path traversal (e.g. "../../etc/passwd")
    if (!fullPath.startsWith(resolvedDir)) {
      throw new Error(`Path traversal detected: ${node.path}`);
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, node.content ?? "", "utf-8");
  }
}
