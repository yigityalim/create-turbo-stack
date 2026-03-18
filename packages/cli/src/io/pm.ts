import { execSync } from "node:child_process";

export type PM = "bun" | "pnpm" | "npm" | "yarn";

const installCmd: Record<PM, string> = {
  bun: "bun install",
  pnpm: "pnpm install",
  npm: "npm install",
  yarn: "yarn install",
};

export function installDependencies(dir: string, pm: PM): void {
  execSync(installCmd[pm], { cwd: dir, stdio: "inherit" });
}
