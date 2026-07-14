"use client";

import { Search } from "lucide-react";

export function SearchButton() {
  return (
    <button
      type="button"
      aria-label="Search documentation"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-card-hover hover:text-foreground"
      onClick={() => {
        // UI only — search will be wired later
      }}
    >
      <Search className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
        ⌘K
      </kbd>
    </button>
  );
}
