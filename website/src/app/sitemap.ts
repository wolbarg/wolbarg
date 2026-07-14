import type { MetadataRoute } from "next";
import { getAllDocSlugs } from "@/content/docs/registry";
import { siteConfig } from "@/lib/site";

const STATIC_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/docs/introduction", changeFrequency: "weekly", priority: 0.95 },
  { path: "/docs/installation", changeFrequency: "monthly", priority: 0.9 },
  { path: "/docs/quick-start", changeFrequency: "monthly", priority: 0.9 },
  { path: "/benchmarks", changeFrequency: "weekly", priority: 0.85 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const docEntries: MetadataRoute.Sitemap = getAllDocSlugs()
    .map((slug) => `/docs/${slug.join("/")}`)
    .filter(
      (path) => !STATIC_ROUTES.some((route) => route.path === path),
    )
    .map((path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path.includes("/api/") ? 0.7 : 0.75,
    }));

  const discoverability: MetadataRoute.Sitemap = [
    {
      url: `${siteConfig.url}/llms.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  return [...staticEntries, ...docEntries, ...discoverability];
}
