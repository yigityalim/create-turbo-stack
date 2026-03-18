import fs from "node:fs/promises";
import path from "node:path";
import type { FileTreeNode } from "@create-turbo-stack/schema";

export async function writeFiles(outputDir: string, nodes: FileTreeNode[]): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });

  for (const node of nodes) {
    if (node.isDirectory) continue;

    const fullPath = path.join(outputDir, node.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, node.content ?? "", "utf-8");
  }
}
