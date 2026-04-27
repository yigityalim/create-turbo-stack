import fs from "node:fs/promises";
import path from "node:path";

const LOCK_FILE = ".turbo-stack.lock";
/** Locks older than this are treated as stale (process died). */
const STALE_AFTER_MS = 10 * 60 * 1000;

// Cross-process advisory lock — protects `.turbo-stack.json` from
// concurrent CLI invocations. `wx` flag is the exclusivity guarantee.
export async function withLock<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = path.join(cwd, LOCK_FILE);
  await acquire(lockPath);
  try {
    return await fn();
  } finally {
    await fs.rm(lockPath, { force: true }).catch(() => {});
  }
}

async function acquire(lockPath: string): Promise<void> {
  // existing lock for staleness; if stale, reclaim it.
  try {
    await fs.writeFile(lockPath, `${process.pid}\n${Date.now()}\n`, { flag: "wx" });
    return;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }

  let stat: import("node:fs").Stats;
  try {
    stat = await fs.stat(lockPath);
  } catch {
    // Disappeared between the failed write and stat — try again from scratch.
    return acquire(lockPath);
  }

  if (Date.now() - stat.mtimeMs > STALE_AFTER_MS) {
    await fs.rm(lockPath, { force: true }).catch(() => {});
    return acquire(lockPath);
  }

  throw new LockHeldError(lockPath, stat.mtimeMs);
}

export class LockHeldError extends Error {
  constructor(
    public readonly lockPath: string,
    public readonly heldSince: number,
  ) {
    const ageSeconds = Math.round((Date.now() - heldSince) / 1000);
    super(
      `Another create-turbo-stack process is mutating this project (lock at ${lockPath}, held ${ageSeconds}s ago). ` +
        `Wait for it to finish, or remove the file manually if you're sure no other process is running.`,
    );
    this.name = "LockHeldError";
  }
}
