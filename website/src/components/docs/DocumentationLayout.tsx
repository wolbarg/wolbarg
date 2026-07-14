import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TableOfContents } from "./TableOfContents";
import { Breadcrumb, PageHeader } from "@/components/ui/PageHeader";
import type { DocHeading } from "@/types/docs";

export function DocumentationLayout({
  children,
  title,
  description,
  section,
  headings,
}: {
  children: ReactNode;
  title: string;
  description: string;
  section: string;
  headings: DocHeading[];
  pathname?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[90rem] gap-8 px-4 py-8 sm:px-6 lg:gap-12 xl:gap-14">
      <aside className="hidden w-60 shrink-0 md:block lg:w-64">
        <div className="sticky top-[4.5rem] max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-3 [scrollbar-width:thin]">
          <Sidebar />
        </div>
      </aside>

      <div className="min-w-0 flex-1 pt-1">
        <Breadcrumb
          items={[
            { label: "Docs", href: "/docs/introduction" },
            { label: section },
            { label: title },
          ]}
        />
        <PageHeader title={title} description={description} eyebrow={section} />
        <article className="prose-docs max-w-none xl:max-w-[48rem]">
          {children}
        </article>
      </div>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-[4.5rem] max-h-[calc(100vh-5.5rem)] overflow-y-auto pl-2">
          <TableOfContents headings={headings} />
        </div>
      </aside>
    </div>
  );
}
