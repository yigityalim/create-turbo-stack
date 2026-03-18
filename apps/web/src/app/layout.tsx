import { RootProvider } from "fumadocs-ui/provider/next";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./global.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "create-turbo-stack",
    template: "%s | create-turbo-stack",
  },
  description: "Scaffold production-ready Turborepo monorepos in seconds.",
  openGraph: {
    title: "create-turbo-stack",
    description: "Scaffold production-ready Turborepo monorepos in seconds.",
    url: "https://create-turbo-stack.dev",
    siteName: "create-turbo-stack",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "create-turbo-stack",
    description: "Scaffold production-ready Turborepo monorepos in seconds.",
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)] antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
