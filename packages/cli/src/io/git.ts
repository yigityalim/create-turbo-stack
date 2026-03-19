import { execSync } from "node:child_process";

export function initGit(dir: string): void {
  try {
    execSync("git --version", { stdio: "ignore" });
  } catch {
    throw new Error("git is not installed");
  }

  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "chore: initial project setup via create-turbo-stack"', {
    cwd: dir,
    stdio: "pipe",
  });
}
