"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type CodeViewerProps = {
  filePath: string;
  content: string;
};

const EXTENSION_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  md: "markdown",
  mdx: "mdx",
  css: "css",
  scss: "scss",
  html: "html",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sql: "sql",
  prisma: "prisma",
  sh: "bash",
  bash: "bash",
  env: "shellscript",
  gitignore: "text",
  npmrc: "text",
  mjs: "javascript",
  cjs: "javascript",
  mts: "typescript",
};

function getExtension(filePath: string): string {
  const name = filePath.split("/").pop() ?? "";
  if (name.startsWith(".")) return name.slice(1);
  return name.split(".").pop() ?? "";
}

// ─── Shiki lazy loader ────────────────────────────────────────────────────────

type ShikiHighlighter = Awaited<
  ReturnType<typeof import("shiki")["createHighlighter"]>
>;

let highlighterPromise: Promise<ShikiHighlighter> | null = null;

function getHighlighter(): Promise<ShikiHighlighter> {
  if (highlighterPromise) return highlighterPromise;
  highlighterPromise = import("shiki").then((mod) =>
    mod.createHighlighter({
      themes: ["github-dark-default", "github-light-default"],
      langs: [
        "typescript",
        "tsx",
        "javascript",
        "jsx",
        "json",
        "markdown",
        "mdx",
        "css",
        "scss",
        "html",
        "yaml",
        "toml",
        "sql",
        "prisma",
        "bash",
        "shellscript",
        "text",
      ],
    }),
  );
  return highlighterPromise;
}

function useHighlightedCode(code: string, lang: string) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);

    getHighlighter()
      .then((highlighter) => {
        if (id !== requestId.current) return;
        // Use defaultColor: false to enable CSS-based dark/light switching
        const result = highlighter.codeToHtml(code, {
          lang,
          themes: {
            light: "github-light-default",
            dark: "github-dark-default",
          },
          defaultColor: false,
        });
        setHtml(result);
        setLoading(false);
      })
      .catch(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [code, lang]);

  return { html, loading };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const ext = useMemo(() => getExtension(filePath), [filePath]);
  const language = EXTENSION_LANG[ext] ?? "text";
  const { html, loading } = useHighlightedCode(content, language);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text approach
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-fd-background">
      {/* Header */}
      <div className="flex items-center justify-between border-fd-border border-b bg-fd-muted/10 px-3 py-1.5">
        <span className="truncate font-mono text-xs text-fd-muted-foreground">
          {filePath}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded bg-fd-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground uppercase">
            {language}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors",
              copied
                ? "text-fd-primary"
                : "text-fd-muted-foreground hover:text-fd-foreground",
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="flex-1 overflow-auto select-text">
        {loading && !html ? (
          <div className="flex items-center gap-2 p-4 text-fd-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="font-mono text-xs">
              Loading syntax highlighter...
            </span>
          </div>
        ) : html ? (
          <div
            className={cn(
              "shiki-code select-text p-3",
              "[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0",
              "[&_code]:font-mono [&_code]:!text-[13px] [&_code]:!leading-5",
              "[&_.line]:inline-block [&_.line]:w-full",
            )}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is safe
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <FallbackCode content={content} />
        )}
      </div>
    </div>
  );
}

/** Plain text fallback if Shiki fails */
function FallbackCode({ content }: { content: string }) {
  const numberedLines = content
    .split("\n")
    .map((text, idx) => ({ lineNumber: idx + 1, text }));
  return (
    <pre className="p-3">
      <code className="font-mono text-[13px] leading-5">
        {numberedLines.map((line) => (
          <div key={line.lineNumber} className="flex">
            <span className="mr-4 inline-block w-8 select-none text-right text-fd-muted-foreground/40">
              {line.lineNumber}
            </span>
            <span className="text-fd-foreground">{line.text || " "}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}

export function CodeViewerEmpty({
  message = "Select a file to view its content",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full items-center justify-center text-fd-muted-foreground">
      <p className="font-mono text-sm">{message}</p>
    </div>
  );
}
