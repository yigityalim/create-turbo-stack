import { execSync } from "node:child_process";

export function initGit(dir: string): void {
  execSync("git init", { cwd: dir, stdio: "ignore" });
  execSync("git add -A", { cwd: dir, stdio: "ignore" });
  execSync('git commit -m "chore: initial project setup via create-turbo-stack"', {
    cwd: dir,
    stdio: "ignore",
  });
}
