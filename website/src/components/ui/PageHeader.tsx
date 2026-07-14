import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";

export function PageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <header className="mb-10 border-b border-border pb-8">
      {eyebrow ? (
        <p className="mb-2.5 text-sm font-medium text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem] sm:leading-tight">
        {title}
      </h1>
      {description ? (
        <p className="mt-3.5 max-w-2xl text-[1.025rem] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className="inline-flex items-center gap-1.5"
          >
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Callout({
  children,
  title = "Note",
  variant = "note",
}: {
  children: ReactNode;
  title?: string;
  variant?: "note" | "warning";
}) {
  const isWarning = variant === "warning";

  return (
    <aside
      className={`my-7 flex gap-3 rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${
        isWarning
          ? "border-foreground/20 bg-foreground/[0.03]"
          : "border-border bg-muted/50"
      }`}
      role="note"
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">
        {isWarning ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Info className="h-4 w-4" />
        )}
      </span>
      <div>
        <p className="mb-1 font-semibold text-foreground">{title}</p>
        <div className="text-muted-foreground [&_a]:text-accent [&_code]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_pre]:mt-3">
          {children}
        </div>
      </div>
    </aside>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <Callout title="Note" variant="note">
      {children}
    </Callout>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <Callout title="Warning" variant="warning">
      {children}
    </Callout>
  );
}
