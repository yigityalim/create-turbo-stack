"use client";

/**
 * README / `.md` preview as a React tree — no `dangerouslySetInnerHTML`.
 *
 * Markdown is parsed once into a typed AST and emitted as React elements, so
 * every chunk of user text passes through React's automatic escaping. Links
 * are restricted to `http(s):` at the parser — `javascript:` / `data:` /
 * `file:` URLs never become an `<a href>`. Coverage is intentionally tight
 * (headings, paragraphs, code, lists, links, emphasis, strikethrough, hr,
 * blockquote, GitHub-flavored tables) — enough for a CTS-generated README.
 * If we ever need tables of contents, footnotes, or HTML pass-through, swap
 * in `marked` + `DOMPurify` here behind the same export surface.
 */

import { useMemo } from "react";
import { cn } from "@/lib/cn";

// ─── AST ──────────────────────────────────────────────────────────────────────

type TableAlign = "left" | "right" | "center";

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "fence"; lang: string; code: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "table"; headers: string[]; aligns: TableAlign[]; rows: string[][] }
  | { type: "hr" };

// ─── Parser ───────────────────────────────────────────────────────────────────

const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
const TABLE_ROW_RE = /^\s*\|.+\|\s*$/;

function splitPipes(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseAlign(spec: string): TableAlign {
  const t = spec.trim();
  const left = t.startsWith(":");
  const right = t.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    const fence = /^```([\w-]*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || "text";
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "fence", lang, code: code.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: heading[2],
      });
      i += 1;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // Blockquote (consecutive `> ` lines, blank line ends).
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    // GFM table: row + `|---|---|` separator + body.
    if (
      TABLE_ROW_RE.test(line) &&
      i + 1 < lines.length &&
      TABLE_SEPARATOR_RE.test(lines[i + 1])
    ) {
      const headers = splitPipes(line);
      const aligns = splitPipes(lines[i + 1]).map(parseAlign);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW_RE.test(lines[i])) {
        rows.push(splitPipes(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, aligns, rows });
      continue;
    }

    const isUl = /^[-*]\s+/.test(line);
    const isOl = /^\d+\.\s+/.test(line);
    if (isUl || isOl) {
      const items: string[] = [];
      while (
        i < lines.length &&
        ((isOl && /^\d+\.\s+/.test(lines[i])) ||
          (!isOl && /^[-*]\s+/.test(lines[i])))
      ) {
        items.push(lines[i].replace(/^([-*]|\d+\.)\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered: isOl, items });
      continue;
    }

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    // Paragraph — accumulate consecutive non-blank, non-block lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^-{3,}\s*$/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !(
        TABLE_ROW_RE.test(lines[i]) &&
        i + 1 < lines.length &&
        TABLE_SEPARATOR_RE.test(lines[i + 1])
      )
    ) {
      para.push(lines[i]);
      i += 1;
    }
    if (para.length > 0)
      blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

// ─── Inline parser → React nodes ──────────────────────────────────────────────

/**
 * Emit React nodes for inline markdown — `code`, **bold**, *italic*,
 * ~~strikethrough~~, and `[text](http(s)://…)` links. Plain text flows through
 * React (auto-escape). Longest tokens are tried first so `**foo**` isn't eaten
 * by single-`*` italic.
 */
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = "";
  let i = 0;
  let key = 0;
  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Inline code: `code`
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        flush();
        out.push(
          <InlineCode key={`c${key++}`}>{text.slice(i + 1, end)}</InlineCode>,
        );
        i = end + 1;
        continue;
      }
    }

    // Strikethrough: ~~text~~
    if (ch === "~" && text[i + 1] === "~") {
      const end = text.indexOf("~~", i + 2);
      if (end > i + 2) {
        flush();
        out.push(
          <del key={`s${key++}`} className="opacity-60 line-through">
            {renderInline(text.slice(i + 2, end))}
          </del>,
        );
        i = end + 2;
        continue;
      }
    }

    // Bold: **text**
    if (ch === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push(
          <strong
            key={`b${key++}`}
            className="font-semibold text-fd-foreground"
          >
            {renderInline(text.slice(i + 2, end))}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // Italic: *text* (single asterisk, not part of ** and not surrounded by *)
    if (ch === "*" && text[i + 1] !== "*" && text[i - 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i + 1 && text[end + 1] !== "*") {
        flush();
        out.push(
          <em key={`i${key++}`} className="italic">
            {renderInline(text.slice(i + 1, end))}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    // Link: [text](url) — http(s) only, no javascript:/data:/file:.
    if (ch === "[") {
      const close = text.indexOf("]", i + 1);
      if (close > i && text[close + 1] === "(") {
        const paren = text.indexOf(")", close + 2);
        if (paren > close) {
          const linkText = text.slice(i + 1, close);
          const linkUrl = text.slice(close + 2, paren);
          if (/^https?:\/\//.test(linkUrl)) {
            flush();
            out.push(
              <a
                key={`a${key++}`}
                href={linkUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-fd-primary underline decoration-fd-primary/40 underline-offset-2 hover:decoration-fd-primary"
              >
                {renderInline(linkText)}
              </a>,
            );
            i = paren + 1;
            continue;
          }
        }
      }
    }

    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Render parsed markdown. Sizing/spacing follows the builder's compact
 * monospace-leaning aesthetic — headings step down quickly, padding stays
 * tight, code styling reuses the same muted backgrounds as the rest of the
 * preview pane.
 */
export function MarkdownPreview({ content }: { content: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  return (
    <div className="select-text px-5 py-4 font-sans text-[13.5px] leading-6 text-fd-foreground/90">
      {blocks.map((block, idx) => renderBlock(block, `b${idx}`))}
    </div>
  );
}

function renderBlock(block: Block, key: string): React.ReactNode {
  switch (block.type) {
    case "heading":
      return <Heading key={key} level={block.level} text={block.text} />;
    case "paragraph":
      return (
        <p key={key} className="my-2.5">
          {renderInline(block.text)}
        </p>
      );
    case "fence":
      return <FenceBlock key={key} lang={block.lang} code={block.code} />;
    case "list":
      return (
        <ListBlock key={key} ordered={block.ordered} items={block.items} />
      );
    case "blockquote":
      return <Blockquote key={key} lines={block.lines} />;
    case "table":
      return (
        <TableBlock
          key={key}
          headers={block.headers}
          aligns={block.aligns}
          rows={block.rows}
        />
      );
    case "hr":
      return <hr key={key} className="my-5 border-fd-border" />;
  }
}

const HEADING_CLASS: Record<number, string> = {
  1: "mt-0 mb-3 font-semibold text-[18px] tracking-tight text-fd-foreground",
  2: "mt-5 mb-2 font-semibold text-[15px] tracking-tight border-b border-fd-border pb-1.5 text-fd-foreground",
  3: "mt-4 mb-1.5 font-semibold text-[14px] text-fd-foreground",
  4: "mt-3 mb-1 font-semibold text-[13px] text-fd-foreground",
  5: "mt-3 mb-1 font-semibold text-[12.5px] text-fd-foreground/90",
  6: "mt-3 mb-1 font-semibold text-[12px] uppercase tracking-wide text-fd-muted-foreground",
};

function Heading({
  level,
  text,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}) {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  return <Tag className={HEADING_CLASS[level]}>{renderInline(text)}</Tag>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[3px] border border-fd-border/60 bg-fd-muted/30 px-1 py-px font-mono text-[12px] text-fd-foreground">
      {children}
    </code>
  );
}

function FenceBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <pre className="my-3 overflow-auto rounded-[3px] border border-fd-border/60 bg-fd-muted/20">
      <div className="flex items-center justify-between border-fd-border/40 border-b px-2.5 py-1">
        <span className="font-mono text-[10px] text-fd-muted-foreground uppercase">
          {lang}
        </span>
      </div>
      <code className="block px-3 py-2.5 font-mono text-[12px] leading-5 text-fd-foreground/90">
        {code}
      </code>
    </pre>
  );
}

function ListBlock({ ordered, items }: { ordered: boolean; items: string[] }) {
  const Tag = ordered ? "ol" : "ul";
  const listClass = ordered ? "list-decimal" : "list-disc";
  return (
    <Tag
      className={cn(
        "my-2.5 space-y-1 pl-5 marker:text-fd-muted-foreground",
        listClass,
      )}
    >
      {items.map((item, j) => (
        <li key={`li-${item.slice(0, 32) || j}`} className="leading-6">
          {renderInline(item)}
        </li>
      ))}
    </Tag>
  );
}

function Blockquote({ lines }: { lines: string[] }) {
  return (
    <blockquote className="my-3 rounded-r-[3px] border-fd-primary/30 border-l-2 bg-fd-muted/15 px-3 py-2 text-fd-muted-foreground italic">
      {lines.map((line, j) => (
        <p
          key={`q-${line.slice(0, 32) || j}`}
          className={j === 0 ? "my-0" : "mt-1.5"}
        >
          {renderInline(line)}
        </p>
      ))}
    </blockquote>
  );
}

const ALIGN_CLASS: Record<TableAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function TableBlock({
  headers,
  aligns,
  rows,
}: {
  headers: string[];
  aligns: TableAlign[];
  rows: string[][];
}) {
  return (
    <div className="my-3 overflow-x-auto rounded-[3px] border border-fd-border/60">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-fd-border border-b bg-fd-muted/20">
            {headers.map((h, j) => (
              <th
                key={`th:${h}`}
                className={cn(
                  "px-3 py-1.5 font-semibold text-fd-foreground",
                  ALIGN_CLASS[aligns[j] ?? "left"],
                )}
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`tr:${row.join("|")}`}
              className="border-fd-border/40 border-b last:border-0"
            >
              {row.map((cell, c) => (
                <td
                  key={`td:${headers[c] ?? c}:${cell}`}
                  className={cn(
                    "px-3 py-1.5 align-top",
                    ALIGN_CLASS[aligns[c] ?? "left"],
                  )}
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
