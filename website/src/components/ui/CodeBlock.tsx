"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markup";

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
};

function normalizeLanguage(language: string) {
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    shell: "bash",
    sh: "bash",
  };
  return map[language] ?? language;
}

export function CodeBlock({
  code,
  language = "ts",
  filename,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const normalized = normalizeLanguage(language);
  const trimmed = code.trim();

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[normalized] ?? Prism.languages.typescript;
    if (!grammar) {
      return Prism.util.encode(trimmed) as string;
    }
    return Prism.highlight(trimmed, grammar, normalized);
  }, [trimmed, normalized]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="group my-5 overflow-hidden rounded-xl border border-border bg-code shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-code-header px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {filename ? (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {filename}
            </span>
          ) : (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {normalized}
            </span>
          )}
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {normalized}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-40 transition-all hover:bg-card hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[0.8125rem] leading-6 text-code-foreground">
        <code
          className={`language-${normalized} font-mono`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-border bg-code px-1.5 py-0.5 font-mono text-[0.84em]">
      {children}
    </code>
  );
}
