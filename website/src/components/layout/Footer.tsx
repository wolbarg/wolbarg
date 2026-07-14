"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { siteConfig } from "@/lib/site";
import { ensureGsap, gsap } from "@/lib/gsap";

const footerLinks = [
  { href: "/docs/introduction", label: "Documentation", external: false },
  { href: siteConfig.links.github, label: "GitHub", external: true },
  { href: siteConfig.links.npm, label: "npm", external: true },
  {
    href: `${siteConfig.links.github}/blob/main/LICENSE`,
    label: "License",
    external: true,
  },
];

export function Footer() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    ensureGsap();
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 96%",
            once: true,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={ref}
      className="border-t border-border bg-background"
      style={{ opacity: 0 }}
    >
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold tracking-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-md"
            />
            {siteConfig.name}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            agentOrc is a local-first semantic memory SDK for AI agents. Shared
            multi-agent memory on SQLite + sqlite-vec —{" "}
            <a
              href={siteConfig.links.npm}
              className="underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              npm install agentorc
            </a>
            .
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:justify-self-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/docs/introduction"
                  className="transition-colors hover:text-foreground"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/benchmarks"
                  className="transition-colors hover:text-foreground"
                >
                  Benchmarks
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/quick-start"
                  className="transition-colors hover:text-foreground"
                >
                  Quick Start
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/installation"
                  className="transition-colors hover:text-foreground"
                >
                  Installation
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Links
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {footerLinks
                .filter((l) => l.external)
                .map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} agentOrc. MIT License.</span>
          <span>Built for multi-agent applications.</span>
        </div>
      </div>
    </footer>
  );
}
