"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { ensureGsap, gsap } from "@/lib/gsap";
import { HeroSessionTerminal } from "@/components/ui/HeroSessionTerminal";

const INSTALL_CMD = "npm install agentorc";

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    ensureGsap();
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo(
        "[data-hero-copy] > *",
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08 },
      ).fromTo(
        "[data-hero-visual]",
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.7 },
        "-=0.35",
      );

      gsap.to("[data-hero-parallax]", {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden border-b border-border"
    >
      <div
        data-hero-parallax
        className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:py-24"
      >
        <div data-hero-copy className="min-w-0 lg:self-center">
          <p
            className="mb-4 text-sm font-medium tracking-wide text-muted-foreground"
            style={{ opacity: 0 }}
          >
            Local-first TypeScript SDK · npm install agentorc
          </p>
          <h1
            className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]"
            style={{ opacity: 0 }}
          >
            agentOrc
          </h1>
          <p
            className="mt-3 max-w-xl text-xl font-medium tracking-tight text-foreground/90 sm:text-2xl sm:leading-snug"
            style={{ opacity: 0 }}
          >
            Shared semantic memory for AI agents
          </p>
          <p
            className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ opacity: 0 }}
          >
            agentOrc gives multiple agents one persistent memory they can all
            write to and search — stored locally in SQLite, retrieved by meaning,
            with a tiny TypeScript API.
          </p>
          <p
            className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground"
            style={{ opacity: 0 }}
          >
            No Redis glue. No JSON scratch files. No custom locking. Just{" "}
            <code className="rounded border border-border bg-code px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              remember()
            </code>{" "}
            and{" "}
            <code className="rounded border border-border bg-code px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              recall()
            </code>
            .
          </p>

          <div className="mt-7 max-w-md" style={{ opacity: 0 }}>
            <div className="group relative overflow-hidden rounded-lg border border-border bg-code">
              <pre className="overflow-x-auto px-3.5 py-3 font-mono text-sm text-code-foreground">
                <span className="select-none text-muted-foreground">$ </span>
                {INSTALL_CMD}
              </pre>
              <button
                type="button"
                onClick={copyInstall}
                aria-label={copied ? "Copied" : "Copy install command"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3" style={{ opacity: 0 }}>
            <Link href="/docs/quick-start" className="btn btn-primary">
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/docs/introduction" className="btn btn-secondary">
              Documentation
            </Link>
          </div>
        </div>

        <div data-hero-visual className="min-w-0 lg:self-center" style={{ opacity: 0 }}>
          <HeroSessionTerminal />
          <p className="mt-3 text-center text-xs text-muted-foreground lg:text-left">
            Planner writes · worker recalls · same shared memory
          </p>
        </div>
      </div>
    </section>
  );
}
