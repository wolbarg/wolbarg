"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { docsNavigation } from "@/lib/docs-nav";
import { siteConfig } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-card-hover"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 top-14 z-40 bg-black/20 backdrop-blur-[1px] dark:bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-14 z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-border bg-background p-4 shadow-lg">
            <div className="mb-4 flex flex-col gap-0.5">
              <Link
                href="/docs/introduction"
                className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                Documentation
              </Link>
              <Link
                href="/benchmarks"
                className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                Benchmarks
              </Link>
              {[
                { href: siteConfig.links.github, label: "GitHub" },
                { href: siteConfig.links.npm, label: "npm" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="space-y-5 border-t border-border pt-4">
              {docsNavigation.map((section) => (
                <div key={section.title}>
                  <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <li key={item.href + item.title}>
                        <Link
                          href={item.href}
                          className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                          onClick={() => setOpen(false)}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
