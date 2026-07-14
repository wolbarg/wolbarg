"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import { SearchButton } from "./SearchButton";
import { MobileNav } from "./MobileNav";

const links = [
  { href: "/docs/introduction", label: "Documentation", external: false },
  { href: "/benchmarks", label: "Benchmarks", external: false },
  { href: siteConfig.links.github, label: "GitHub", external: true },
  { href: siteConfig.links.npm, label: "npm", external: true },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md transition-[height,box-shadow] duration-200 supports-[backdrop-filter]:bg-background/70 ${
        scrolled ? "shadow-[0_1px_0_rgba(0,0,0,0.04)]" : ""
      }`}
    >
      <div
        className={`mx-auto flex max-w-[90rem] items-center gap-5 px-4 transition-[height] duration-200 sm:px-6 ${
          scrolled ? "h-12" : "h-14"
        }`}
      >
        <MobileNav />

        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.svg"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-md"
          />
          <span className="text-[0.95rem]">{siteConfig.name}</span>
        </Link>

        <nav
          className="ml-1 hidden items-center gap-5 md:flex"
          aria-label="Primary"
        >
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="nav-link py-1 text-sm"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link py-1 text-sm"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
