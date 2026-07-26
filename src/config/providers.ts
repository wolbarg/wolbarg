/**
 * Embedding provider presets for `wolbarg init` and project config.
 *
 * Base URLs are defaults the user must see and may edit — never silently applied
 * without showing the field.
 */

export type EmbeddingProviderId =
  | "openai"
  | "ollama"
  | "openrouter"
  | "lmstudio"
  | "gemini"
  | "together"
  | "vllm"
  | "custom";

export interface EmbeddingProviderPreset {
  id: EmbeddingProviderId;
  label: string;
  /** Default OpenAI-compatible embeddings base URL (shown to the user). */
  defaultBaseUrl: string;
  /** Suggested default model id (shown to the user). */
  defaultModel: string;
  /** Env var name written into config / `.env`. */
  apiKeyEnv: string;
  /** Hint shown next to the API key prompt. */
  apiKeyHint?: string;
}

export const EMBEDDING_PROVIDER_PRESETS: readonly EmbeddingProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "text-embedding-3-small",
    apiKeyEnv: "OPENAI_API_KEY",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    defaultModel: "nomic-embed-text",
    apiKeyEnv: "OLLAMA_API_KEY",
    apiKeyHint: "Any non-empty value works locally (e.g. ollama)",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/text-embedding-3-small",
    apiKeyEnv: "OPENROUTER_API_KEY",
  },
  {
    id: "lmstudio",
    label: "LM Studio (local)",
    defaultBaseUrl: "http://127.0.0.1:1234/v1",
    defaultModel: "text-embedding-nomic-embed-text-v1.5",
    apiKeyEnv: "LM_STUDIO_API_KEY",
    apiKeyHint: "Often unused locally — any non-empty value is fine",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultBaseUrl:
      "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "text-embedding-004",
    apiKeyEnv: "GEMINI_API_KEY",
  },
  {
    id: "together",
    label: "Together AI",
    defaultBaseUrl: "https://api.together.xyz/v1",
    defaultModel: "togethercomputer/m2-bert-80M-8k-retrieval",
    apiKeyEnv: "TOGETHER_API_KEY",
  },
  {
    id: "vllm",
    label: "vLLM (local/server)",
    defaultBaseUrl: "http://127.0.0.1:8000/v1",
    defaultModel: "text-embedding-ada-002",
    apiKeyEnv: "VLLM_API_KEY",
    apiKeyHint: "Only if your server requires auth",
  },
  {
    id: "custom",
    label: "Custom OpenAI-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "text-embedding-3-small",
    apiKeyEnv: "WOLBARG_EMBEDDING_API_KEY",
  },
] as const;

export function getEmbeddingProviderPreset(
  id: string,
): EmbeddingProviderPreset | undefined {
  return EMBEDDING_PROVIDER_PRESETS.find((p) => p.id === id);
}

export const DEFAULT_SQLITE_DB_PATH = ".wolbarg/shared-memory/memory.db";
export const DEFAULT_ORGANIZATION = "default";
export const DEFAULT_CONFIG_PATH = ".wolbarg/config.json";
export const DEFAULT_ENV_PATH = ".wolbarg/.env";
