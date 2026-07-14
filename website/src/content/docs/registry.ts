import type { DocPage } from "@/lib/docs";
import {
  installation,
  introduction,
  quickStart,
} from "@/content/docs/getting-started";
import {
  configuration,
  embeddingsConfig,
  providersConfig,
  storageConfig,
} from "@/content/docs/configuration";
import {
  agentOrcApi,
  compressApi,
  forgetApi,
  historyApi,
  ingestApi,
  lifecycleApi,
  recallApi,
  rememberApi,
} from "@/content/docs/api";
import {
  chunkingIngest,
  documentsIngest,
  hybridRetrieval,
  metadataRetrieval,
  ocrVisionIngest,
  rerankRetrieval,
} from "@/content/docs/guides-v02";
import {
  bestPractices,
  errorsRef,
  initCompat,
  limitationsV02,
  migrationV02,
  sharedMemory,
  typesRef,
  whatsNewV02,
} from "@/content/docs/guides";

const pages: DocPage[] = [
  introduction,
  installation,
  quickStart,
  configuration,
  storageConfig,
  embeddingsConfig,
  providersConfig,
  agentOrcApi,
  rememberApi,
  recallApi,
  ingestApi,
  compressApi,
  forgetApi,
  historyApi,
  lifecycleApi,
  hybridRetrieval,
  metadataRetrieval,
  rerankRetrieval,
  documentsIngest,
  chunkingIngest,
  ocrVisionIngest,
  sharedMemory,
  whatsNewV02,
  migrationV02,
  limitationsV02,
  bestPractices,
  typesRef,
  errorsRef,
  initCompat,
];

export const docsBySlug = Object.fromEntries(
  pages.map((page) => {
    const slug = page.href.replace(/^\/docs\//, "");
    return [slug, page];
  }),
) as Record<string, DocPage>;

export function getDocFromSlug(slugParts: string[] | undefined) {
  if (!slugParts || slugParts.length === 0) {
    return null;
  }
  const key = slugParts.join("/");
  return docsBySlug[key] ?? null;
}

export function getAllDocSlugs() {
  return Object.keys(docsBySlug).map((slug) => slug.split("/"));
}
