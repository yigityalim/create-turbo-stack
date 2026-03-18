import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const gitConfig = {
  user: "yigityalim",
  repo: "create-turbo-stack",
  branch: "main",
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "create-turbo-stack",
    },
    links: [
      { text: "Builder", url: "/builder" },
      { text: "Presets", url: "/presets" },
      { text: "Docs", url: "/docs" },
    ],
    githubUrl: "https://github.com/yigityalim/create-turbo-stack",
  };
}
