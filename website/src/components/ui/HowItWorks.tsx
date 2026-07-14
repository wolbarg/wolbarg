"use client";

import { useLayoutEffect, useRef } from "react";
import { ArrowDown } from "lucide-react";
import { ensureGsap, gsap } from "@/lib/gsap";

const steps = [
  {
    label: "Agent remembers",
    detail: "One agent calls remember() with a fact and optional metadata.",
  },
  {
    label: "Embedding generated",
    detail: "content.text is embedded through your OpenAI-compatible endpoint.",
  },
  {
    label: "Stored in SQLite + sqlite-vec",
    detail: "Original text, metadata, and vector land in a local ACID write.",
  },
  {
    label: "Another agent recalls",
    detail: "A different agent asks in natural language and gets ranked hits.",
  },
];

export function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    ensureGsap();
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>("[data-flow-step]");
      const arrows = gsap.utils.toArray<HTMLElement>("[data-flow-arrow]");

      gsap.set(items, { autoAlpha: 0, y: 18 });
      gsap.set(arrows, { autoAlpha: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 72%",
          end: "bottom 50%",
          scrub: 0.55,
        },
      });

      items.forEach((item, index) => {
        tl.to(item, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" });
        if (arrows[index]) {
          tl.to(
            arrows[index],
            { autoAlpha: 1, duration: 0.25, ease: "power1.out" },
            "-=0.05",
          );
        }
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Write once. Recall by meaning.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            The whole product fits in one loop: store text as vectors, keep the
            original, search later with natural language.
          </p>
        </div>

        <ol className="flex flex-col lg:flex-row lg:items-stretch">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="flex flex-1 flex-col lg:flex-row lg:items-center"
            >
              <div
                data-flow-step
                className="flex-1 rounded-xl border border-border bg-card p-5"
                style={{ opacity: 0 }}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {step.label}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              </div>
              {index < steps.length - 1 ? (
                <div
                  data-flow-arrow
                  className="flex items-center justify-center py-3 text-muted-foreground lg:px-3 lg:py-0"
                  style={{ opacity: 0 }}
                  aria-hidden="true"
                >
                  <ArrowDown className="h-4 w-4 lg:-rotate-90" />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
