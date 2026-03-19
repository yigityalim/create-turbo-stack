import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stack Builder",
  description:
    "Visual builder for create-turbo-stack — configure your Turborepo monorepo and preview the generated file tree.",
  openGraph: {
    title: "Stack Builder | create-turbo-stack",
    description:
      "Visual builder for create-turbo-stack — configure your Turborepo monorepo and preview the generated file tree.",
  },
};

export default function BuilderLayout({ children }: LayoutProps<"/">) {
  return children;
}
