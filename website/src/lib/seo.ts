import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

/** Absolute URL for a path on the site. */
export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return siteConfig.url;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageSeoInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  type?: "website" | "article";
  noIndex?: boolean;
  /** Skip the root layout `%s · brand` template. */
  absoluteTitle?: boolean;
};

/** Build consistent Metadata for a page. */
export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords = [...siteConfig.keywords],
  type = "website",
  noIndex = false,
  absoluteTitle = false,
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);
  const alreadyBranded =
    absoluteTitle ||
    title.includes(siteConfig.name) ||
    title === siteConfig.title;
  const fullTitle = alreadyBranded
    ? title
    : `${title} · ${siteConfig.name}`;

  return {
    title: alreadyBranded ? { absolute: fullTitle } : title,
    description,
    keywords,
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    creator: siteConfig.author.name,
    publisher: siteConfig.name,
    category: "Software",
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

/** Root JSON-LD graph for the marketing site. */
export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        alternateName: ["AgentOrc", "agentorc", "Agent ORC"],
        url: siteConfig.url,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/brand/logo.svg"),
        },
        sameAs: [...siteConfig.sameAs],
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/#software`,
        name: siteConfig.name,
        alternateName: ["AgentOrc", "agentorc"],
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Node.js 22.5+",
        description: siteConfig.longDescription,
        url: siteConfig.url,
        downloadUrl: siteConfig.links.npm,
        installUrl: siteConfig.links.npm,
        softwareVersion: "0.1.2",
        license: "https://opensource.org/licenses/MIT",
        author: {
          "@type": "Person",
          name: siteConfig.author.name,
          url: siteConfig.author.url,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        codeRepository: siteConfig.links.github,
        programmingLanguage: ["TypeScript", "JavaScript"],
        keywords: siteConfig.keywords.join(", "),
        isAccessibleForFree: true,
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${siteConfig.url}/#source`,
        name: "agentorc",
        codeRepository: siteConfig.links.github,
        programmingLanguage: "TypeScript",
        runtimePlatform: "Node.js",
        license: "https://opensource.org/licenses/MIT",
        url: siteConfig.links.github,
      },
    ],
  };
}

export function buildFaqJsonLd(
  items: readonly { q: string; a: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}
