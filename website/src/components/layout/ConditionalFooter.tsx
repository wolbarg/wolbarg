"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

/** Site footer — hidden on documentation routes. */
export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/docs")) {
    return null;
  }
  return <Footer />;
}
