"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

const EASE = [0.2, 0, 0, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.1, staggerChildren: 0.24 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const asciiRow: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
};

const wipe: Variants = {
  hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
  show: {
    opacity: 1,
    clipPath: "inset(0 0% 0 0)",
    transition: { duration: 0.85, ease: EASE },
  },
};

const ASCII = [
  `█████╗██████╗ ███████╗ █████╗ ████████╗███████╗
██╔══╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
██║   ██████╔╝█████╗  ███████║   ██║   █████╗
██║   ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
╚████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
 ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝`,
  `████████╗██╗   ██╗██████╗ ██████╗  ██████╗
╚══██╔══╝██║   ██║██╔══██╗██╔══██╗██╔═══██╗
   ██║   ██║   ██║██████╔╝██████╔╝██║   ██║
   ██║   ██║   ██║██╔══██╗██╔══██╗██║   ██║
   ██║   ╚██████╔╝██║  ██║██████╔╝╚██████╔╝
   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚═════╝`,
  `███████╗████████╗ █████╗  ██████╗██╗  ██╗
██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
███████╗   ██║   ███████║██║     █████╔╝
╚════██║   ██║   ██╔══██║██║     ██╔═██╗
███████║   ██║   ██║  ██║╚██████╗██║  ██╗
╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝`,
];

type Stat = { value: number; label: string };

export function Hero({ stats }: { stats: Stat[] }) {
  return (
    <section className="relative overflow-hidden border-fd-border border-b">
      <div className="pointer-events-none absolute inset-0 grid-bg" />

      <motion.div
        className="relative flex flex-col items-center gap-8 px-6 pt-16 pb-14"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.span
          variants={item}
          className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.3em]"
        >
          {"// Turborepo scaffold engine"}
        </motion.span>

        <motion.div
          variants={asciiRow}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-3 md:gap-4"
        >
          {ASCII.map((art) => (
            <motion.pre
              key={art.slice(0, 8)}
              variants={wipe}
              className="ascii-art text-[0.5rem] text-fd-primary leading-tight sm:text-xs"
            >
              {art}
            </motion.pre>
          ))}
        </motion.div>

        <motion.p
          variants={item}
          className="max-w-xl text-center text-fd-muted-foreground text-lg leading-relaxed"
        >
          Scaffold production-ready Turborepo monorepos in seconds, not days.
          Database, auth, API, shared UI, environment validation — all wired
          correctly from the start.
        </motion.p>

        <motion.div variants={item} className="w-full max-w-lg">
          <TypewriterTerminal startDelay={1500} />
        </motion.div>

        <motion.div
          variants={item}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/builder"
            className="brutal-hover rounded-[3px] border border-fd-primary bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground text-sm"
          >
            Open Builder
          </Link>
          <Link
            href="/docs"
            className="brutal-hover rounded-[3px] border border-fd-border bg-fd-background px-5 py-2.5 font-medium text-sm"
          >
            Documentation
          </Link>
        </motion.div>
      </motion.div>

      <div className="relative grid grid-cols-2 gap-px border-fd-border border-t bg-fd-border sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 bg-fd-background px-4 py-6 text-center"
          >
            <span className="font-bold font-mono text-2xl text-fd-primary tabular-nums">
              {stat.value}
            </span>
            <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Typewriter terminal ──────────────────────────────────────────────────────

const COMMAND = "npx create-turbo-stack my-project";
const PROMPTS: [string, string][] = [
  ["◆ Package manager?", "bun"],
  ["◆ Database?", "Supabase"],
  ["◆ API layer?", "tRPC v11"],
  ["◆ Auth?", "Supabase Auth"],
];
const OKS = [
  "✓ Created 2 apps, 6 packages",
  "✓ Wired CSS @source directives",
  "✓ Catalog with 47 dependencies",
];
const TOTAL = PROMPTS.length + OKS.length;

function TypewriterTerminal({ startDelay = 1500 }: { startDelay?: number }) {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState("");
  const [lines, setLines] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduce) {
      setTyped(COMMAND);
      setLines(TOTAL);
      setDone(true);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let i = 0;
    const type = () => {
      i += 1;
      setTyped(COMMAND.slice(0, i));
      if (i < COMMAND.length) {
        timers.push(setTimeout(type, 42));
        return;
      }
      for (let l = 0; l < TOTAL; l += 1) {
        timers.push(setTimeout(() => setLines(l + 1), 400 + l * 320));
      }
      timers.push(setTimeout(() => setDone(true), 400 + TOTAL * 320));
    };
    timers.push(setTimeout(type, startDelay));
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [reduce, startDelay]);

  const okShown = Math.max(0, lines - PROMPTS.length);

  return (
    <div className="overflow-hidden rounded-[3px] border border-fd-border bg-fd-card text-left">
      <div className="flex items-center justify-between border-fd-border border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 bg-fd-primary" />
          <span className="font-mono font-semibold text-xs">
            create-turbo-stack
          </span>
        </div>
        <span className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-[0.2em]">
          bash
        </span>
      </div>
      <div className="min-h-[15.5rem] p-4 font-mono text-sm">
        <div className="flex gap-2">
          <span className="text-fd-primary">$</span>
          <span className="break-all">
            {typed}
            {!done && <span className="term-cursor">▋</span>}
          </span>
        </div>
        <div className="mt-3 space-y-0.5 text-fd-muted-foreground">
          {PROMPTS.slice(0, Math.min(lines, PROMPTS.length)).map(
            ([label, value]) => (
              <p key={label}>
                {label} <span className="text-fd-foreground">{value}</span>
              </p>
            ),
          )}
          {OKS.slice(0, okShown).map((text, idx) => (
            <p
              key={text}
              className={idx === 0 ? "mt-2 text-fd-primary" : "text-fd-primary"}
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
