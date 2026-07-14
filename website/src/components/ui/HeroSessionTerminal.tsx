"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";

const SESSION_CODE = `import { AgentOrc } from "agentorc";

const orc = new AgentOrc();
await orc.init({
  organization: "acme",
  database: { provider: "sqlite", connectionString: "./memory.db" },
});

// Planner stores a decision in shared memory
await orc.remember({
  agent: "planner",
  content: { text: "Ship dark mode for the dashboard redesign." },
});

// Worker retrieves it by meaning — no IDs exchanged
const hits = await orc.recall({
  query: "dashboard theme preference",
  topK: 1,
});

console.log(hits[0]?.content.text);`;

const OUTPUT_LINES = [
  "Ship dark mode for the dashboard redesign.",
  "// similarity 0.91 · agent: planner",
];

function indexAfter(snippet: string): number {
  const i = SESSION_CODE.indexOf(snippet);
  return i < 0 ? -1 : i + snippet.length;
}

/** Character indices where typing should pause briefly. */
const PAUSE_AFTER = [
  indexAfter('connectionString: "./memory.db" },\n});'),
  indexAfter(
    'content: { text: "Ship dark mode for the dashboard redesign." },\n});',
  ),
  indexAfter('topK: 1,\n});'),
].filter((i) => i > 0);

const PAUSE_MS = 520;
const HOLD_MS = 3200;
const RESET_MS = 900;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useInView(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

function charDelay(ch: string | undefined): number {
  if (!ch) return 28;
  if (ch === "\n") return 70;
  if (ch === " " || ch === "\t") return 14;
  if ("{}()[],.;".includes(ch)) return 36;
  return 22;
}

function highlightTypeScript(source: string): string {
  const grammar = Prism.languages.typescript;
  if (!grammar) return Prism.util.encode(source) as string;
  const html = Prism.highlight(source, grammar, "typescript");
  return html.replace(
    /\b(remember|recall)\b/g,
    '<span class="hero-term-api">$1</span>',
  );
}

export function HeroSessionTerminal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(rootRef);

  const [visible, setVisible] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reduced) {
      setVisible(SESSION_CODE);
      setOutput(OUTPUT_LINES);
      setTyping(false);
      return;
    }

    if (!inView) {
      setVisible("");
      setOutput([]);
      setTyping(false);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        timers.push(id);
      });

    async function runCycle() {
      setVisible("");
      setOutput([]);
      setTyping(true);
      await wait(380);
      if (cancelled) return;

      let i = 0;
      while (i < SESSION_CODE.length) {
        if (cancelled) return;
        i += 1;
        setVisible(SESSION_CODE.slice(0, i));
        await wait(charDelay(SESSION_CODE[i - 1]));
        if (cancelled) return;
        if (PAUSE_AFTER.includes(i)) {
          await wait(PAUSE_MS);
          if (cancelled) return;
        }
      }

      setTyping(false);
      await wait(420);
      if (cancelled) return;

      setOutput([OUTPUT_LINES[0]]);
      await wait(380);
      if (cancelled) return;
      setOutput(OUTPUT_LINES);

      await wait(HOLD_MS);
      if (cancelled) return;
      await wait(RESET_MS);
    }

    async function loop() {
      while (!cancelled) {
        await runCycle();
      }
    }

    void loop();

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [reduced, inView]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visible, output]);

  const highlighted = useMemo(() => highlightTypeScript(visible), [visible]);
  const lines = visible.length === 0 ? [""] : visible.split("\n");
  const lineCount = Math.max(lines.length, 1);

  return (
    <div
      ref={rootRef}
      className="hero-term mx-auto h-[min(520px,68vh)] w-full max-w-[700px] select-none overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      aria-hidden="true"
    >
      <div className="relative flex h-10 items-center border-b border-neutral-300 bg-neutral-200/90 px-3.5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-[7px]">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]/80" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]/80" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]/80" />
        </div>
        <span className="pointer-events-none absolute inset-x-0 text-center font-mono text-[13px] text-neutral-500 dark:text-neutral-400">
          agent-session.ts
        </span>
      </div>

      <div
        ref={bodyRef}
        className="h-[calc(100%-2.5rem)] overflow-auto px-3 py-3 sm:px-4"
      >
        <div className="flex min-w-0 gap-3">
          <div
            className="shrink-0 select-none text-right font-mono text-[13px] leading-[1.65] text-neutral-400 dark:text-neutral-600"
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>

          <pre className="hero-term-code min-w-0 flex-1 overflow-x-auto font-mono text-[13px] leading-[1.65] text-neutral-700 dark:text-neutral-300">
            <code
              className="language-typescript"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            {typing || (!reduced && visible.length < SESSION_CODE.length) ? (
              <span className="hero-term-cursor" />
            ) : null}
          </pre>
        </div>

        {output.length > 0 ? (
          <div className="mt-4 border-t border-neutral-300 pt-3 font-mono text-[13px] leading-[1.65] dark:border-neutral-800">
            {output.map((line, idx) => (
              <div
                key={`${line}-${idx}`}
                className={
                  line.startsWith("//")
                    ? "text-neutral-500 italic"
                    : "text-neutral-600 dark:text-neutral-300"
                }
              >
                {line.startsWith("//") ? (
                  line
                ) : (
                  <>
                    <span className="text-neutral-400 dark:text-neutral-600">
                      →{" "}
                    </span>
                    {line}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
