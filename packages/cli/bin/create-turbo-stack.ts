// Entry shim — all logic lives in src/cli.ts. The shebang is added by the
// tsup `banner` for this entry; keep this file import-and-run only.
import { run } from "../src/cli";

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
