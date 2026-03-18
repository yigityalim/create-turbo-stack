import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "create-turbo-stack — Production-ready Turborepo in seconds",
  description:
    "Scaffold production-ready Turborepo monorepos in seconds. Database, auth, API, shared UI, environment validation — all wired correctly.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <a href="/" className="font-mono text-sm font-semibold tracking-tight">
              create-turbo-stack
            </a>
            <div className="flex items-center gap-6">
              <a
                href="/builder"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Builder
              </a>
              <a
                href="/presets"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Presets
              </a>
              <a
                href="https://github.com/yigityalim/create-turbo-stack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                GitHub
              </a>
            </div>
          </div>
        </nav>
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
