import {
  AgentOrc,
  bm25,
  createChunkingStrategy,
  openaiEmbedding,
  openaiLlm,
  openaiReranker,
  openaiVision,
  postgres,
  sqlite,
} from "agentorc";
import type { AppConfig, BackendName } from "./config.js";

export interface ClientHandle {
  backend: BackendName;
  memory: AgentOrc;
  label: string;
}

/**
 * Wire AgentOrc with OpenAI for embeddings, LLM, vision, and rerank.
 */
export async function createClientForBackend(
  config: AppConfig,
  backend: BackendName,
): Promise<ClientHandle> {
  if (backend === "postgres") {
    if (!config.postgresUrl) {
      throw new Error("Postgres backend selected but DATABASE_URL is not set.");
    }
  }

  const storage =
    backend === "postgres"
      ? postgres({
          connectionString: config.postgresUrl!,
          maxPoolSize: 5,
        })
      : sqlite(config.sqlitePath);

  const embedding = openaiEmbedding({
    baseUrl: config.openaiBaseUrl,
    apiKey: config.openaiApiKey,
    model: config.embeddingModel,
  });

  const llm = openaiLlm({
    baseUrl: config.openaiBaseUrl,
    apiKey: config.openaiApiKey,
    model: config.llmModel,
    temperature: config.llmTemperature,
    maxTokens: config.llmMaxTokens,
  });

  const memory = new AgentOrc({
    organization: `${config.organization}-${backend}`,
    storage,
    embedding,
    llm,
    keywordSearch: bm25(),
    chunking: createChunkingStrategy("sentence"),
    retrieval: {
      overFetchFactor: 4,
      hybrid: { semanticWeight: 0.7, keywordWeight: 0.3 },
    },
    ...(config.enableRerank
      ? {
          reranker: openaiReranker({
            apiKey: config.openaiApiKey,
            baseUrl: config.openaiBaseUrl,
            model: config.rerankModel,
          }),
        }
      : {}),
    ...(config.enableVision
      ? {
          vision: openaiVision({
            apiKey: config.openaiApiKey,
            baseUrl: config.openaiBaseUrl,
            model: config.visionModel,
          }),
        }
      : {}),
  });

  await memory.ready();

  return {
    backend,
    memory: memory as AgentOrc,
    label: backend.toUpperCase(),
  };
}
