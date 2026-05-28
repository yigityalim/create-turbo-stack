"use client";

import { Check, Code2, Copy, Eye, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MarkdownPreview } from "./markdown-preview";

// ─── File-type → Shiki language ───────────────────────────────────────────────

const EXTENSION_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  mts: "typescript",
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
};

function getLanguage(filePath: string): string {
  const name = filePath.split("/").pop() ?? "";
  const ext = name.startsWith(".")
    ? name.slice(1)
    : (name.split(".").pop() ?? "");
  return EXTENSION_LANG[ext] ?? "text";
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

/** Render `code` as Shiki HTML asynchronously, with cancellation on
 *  subsequent calls so navigating between files doesn't race. */
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

// ─── Public API ───────────────────────────────────────────────────────────────

type CodeViewerProps = {
  filePath: string;
  content: string;
};

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const language = useMemo(() => getLanguage(filePath), [filePath]);
  const isMarkdown = language === "markdown" || language === "mdx";

  const [view, setView] = useState<"code" | "preview">(
    isMarkdown ? "preview" : "code",
  );
  // Reset to preview when navigating to a new markdown file; code for the rest.
  // biome-ignore lint/correctness/useExhaustiveDependencies: filePath is a load-bearing trigger, not a captured value.
  useEffect(() => {
    setView(isMarkdown ? "preview" : "code");
  }, [isMarkdown, filePath]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-fd-background">
      <ViewerHeader
        filePath={filePath}
        language={language}
        content={content}
        isMarkdown={isMarkdown}
        view={view}
        onViewChange={setView}
      />
      <div className="flex-1 overflow-auto select-text">
        {isMarkdown && view === "preview" ? (
          <MarkdownPreview content={content} />
        ) : (
          <ShikiCode code={content} lang={language} />
        )}
      </div>
    </div>
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

// ─── Header (filename, view tabs, language pill, copy) ────────────────────────

function ViewerHeader({
  filePath,
  language,
  content,
  isMarkdown,
  view,
  onViewChange,
}: {
  filePath: string;
  language: string;
  content: string;
  isMarkdown: boolean;
  view: "code" | "preview";
  onViewChange: (v: "code" | "preview") => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-fd-border border-b bg-fd-muted/10 px-3 py-1.5">
      <span className="truncate font-mono text-[11.5px] text-fd-muted-foreground">
        {filePath}
      </span>
      <div className="flex items-center gap-2">
        {isMarkdown && <ViewToggle view={view} onChange={onViewChange} />}
        <span className="rounded-[2px] bg-fd-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground uppercase">
          {language}
        </span>
        <CopyButton text={content} />
      </div>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "code" | "preview";
  onChange: (v: "code" | "preview") => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[3px] bg-fd-muted/20 p-0.5">
      <ToggleButton
        active={view === "code"}
        onClick={() => onChange("code")}
        icon={<Code2 className="h-3 w-3" />}
        label="Code"
      />
      <ToggleButton
        active={view === "preview"}
        onClick={() => onChange("preview")}
        icon={<Eye className="h-3 w-3" />}
        label="Preview"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-mono text-[11px] transition-colors",
        active
          ? "bg-fd-background text-fd-foreground shadow-sm"
          : "text-fd-muted-foreground hover:text-fd-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / locked-down environments: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-mono text-[11px] transition-colors",
        copied
          ? "text-fd-primary"
          : "text-fd-muted-foreground hover:text-fd-foreground",
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ─── Code body (Shiki + fallback) ─────────────────────────────────────────────

function ShikiCode({ code, lang }: { code: string; lang: string }) {
  const { html, loading } = useHighlightedCode(code, lang);

  if (loading && !html) {
    return (
      <div className="flex items-center gap-2 p-4 text-fd-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="font-mono text-xs">Loading syntax highlighter...</span>
      </div>
    );
  }
  if (!html) return <PlainCode code={code} />;

  return (
    <div
      className={cn(
        "shiki-code select-text p-3",
        "[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0",
        "[&_code]:font-mono [&_code]:!text-[12.5px] [&_code]:!leading-5",
        "[&_.line]:inline-block [&_.line]:w-full",
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki tokenises into HTML spans; output is library-controlled, not user-controlled markup.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Plain-text fallback when Shiki fails to load (e.g. offline preview). */
function PlainCode({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <pre className="p-3">
      <code className="font-mono text-[12.5px] leading-5">
        {lines.map((text, idx) => {
          const n = idx + 1;
          return (
            <div key={`line-${n}`} className="flex">
              <span className="mr-4 inline-block w-8 select-none text-right text-fd-muted-foreground/40">
                {n}
              </span>
              <span className="text-fd-foreground">{text || " "}</span>
            </div>
          );
        })}
      </code>
    </pre>
  );
}
