import type { LucideIcon } from "lucide-react";

export function FeatureCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div
      data-feature-item
      className="group rounded-lg p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"
    >
      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors group-hover:border-foreground/20">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <h3 className="text-[0.95rem] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function FeatureGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-feature-grid
      className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4 lg:gap-2"
    >
      {children}
    </div>
  );
}
