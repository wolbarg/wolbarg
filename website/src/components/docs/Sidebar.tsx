"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { docsNavigation } from "@/lib/docs-nav";

function sectionMatches(pathname: string, hrefs: string[]) {
  return hrefs.some((href) => {
    const base = href.split("#")[0] ?? href;
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

export function Sidebar() {
  const pathname = usePathname();
  const initialOpen = useMemo(() => {
    const open: Record<string, boolean> = {};
    for (const section of docsNavigation) {
      open[section.title] = sectionMatches(
        pathname,
        section.items.map((i) => i.href),
      );
    }
    // Always keep at least Getting Started visible if nothing matches
    if (!Object.values(open).some(Boolean)) {
      open["Getting Started"] = true;
    }
    return open;
  }, [pathname]);

  const [openSections, setOpenSections] = useState(initialOpen);

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const section of docsNavigation) {
        if (
          sectionMatches(
            pathname,
            section.items.map((i) => i.href),
          )
        ) {
          next[section.title] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  function toggle(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <nav aria-label="Documentation" className="space-y-1 pb-8">
      {docsNavigation.map((section) => {
        const isOpen = Boolean(openSections[section.title]);
        return (
          <div key={section.title} className="pb-1">
            <button
              type="button"
              onClick={() => toggle(section.title)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{section.title}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
                aria-hidden="true"
              />
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <ul className="overflow-hidden">
                {section.items.map((item) => {
                  const base = item.href.split("#")[0] ?? item.href;
                  const active =
                    pathname === base ||
                    (item.href.includes("#") && pathname === base);
                  return (
                    <li key={`${section.title}-${item.href}-${item.title}`}>
                      <Link
                        href={item.href}
                        className={`relative ml-1 block rounded-md border-l-2 py-1.5 pl-3 pr-2 text-sm transition-colors ${
                          active
                            ? "border-foreground bg-muted/70 font-medium text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
