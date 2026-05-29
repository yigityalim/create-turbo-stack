import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const gitConfig = {
  user: "yigityalim",
  repo: "create-turbo-stack",
  branch: "main",
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-mono font-semibold tracking-tight">
          create-turbo-stack
        </span>
      ),
    },
    links: [
      { text: "Builder", url: "/builder" },
      { text: "Presets", url: "/presets" },
      { text: "Registry", url: "/registry" },
      { text: "Docs", url: "/docs" },
    ],
    githubUrl: "https://github.com/yigityalim/create-turbo-stack",
  };
}
