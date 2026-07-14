import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentationLayout } from "@/components/docs/DocumentationLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAllDocSlugs, getDocFromSlug } from "@/content/docs/registry";
import {
  buildBreadcrumbJsonLd,
  createPageMetadata,
} from "@/lib/seo";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocFromSlug(slug);
  if (!doc) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const brandTitle = `${doc.title} — ${siteConfig.name} Docs`;
  return createPageMetadata({
    title: brandTitle,
    description: `${doc.description} Official ${siteConfig.name} documentation.`,
    path: doc.href,
    type: "article",
    keywords: [
      siteConfig.name,
      "AgentOrc",
      "agentorc",
      doc.title,
      doc.section,
      "AI agent memory",
      "semantic memory SDK",
      "TypeScript",
    ],
  });
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocFromSlug(slug);
  if (!doc) {
    notFound();
  }

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Docs", path: "/docs/introduction" },
    { name: doc.title, path: doc.href },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <DocumentationLayout
        title={doc.title}
        description={doc.description}
        section={doc.section}
        headings={doc.headings}
      >
        {doc.content}
      </DocumentationLayout>
    </>
  );
}
