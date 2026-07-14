"use client";

import { useEffect, useState } from "react";
import type { DocHeading } from "@/types/docs";

export function TableOfContents({ headings }: { headings: DocHeading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop,
          );
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-96px 0px -65% 0px",
        threshold: [0, 1],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="relative space-y-0.5 border-l border-border">
        {headings.map((heading) => {
          const active = activeId === heading.id;
          return (
            <li key={heading.id} className="relative">
              <span
                aria-hidden="true"
                className={`absolute top-1/2 -left-px h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground transition-all duration-200 ${
                  active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50"
                }`}
              />
              <a
                href={`#${heading.id}`}
                className={`block py-1.5 transition-colors duration-200 ${
                  heading.level === 3 ? "pl-5" : "pl-3"
                } ${
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {heading.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
