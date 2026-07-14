"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ensureGsap } from "@/lib/gsap";

/** Staggers feature grid items on scroll. */
export function FeatureMotion({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    ensureGsap();
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const items = root.querySelectorAll("[data-feature-item]");
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 85%",
            once: true,
          },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="[&_[data-feature-item]]:opacity-0">
      {children}
    </div>
  );
}

/** Reveal a docs preview / example section. */
export function DocsPreviewMotion({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    ensureGsap();
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 88%",
            once: true,
          },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
