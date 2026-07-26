/**
 * Project configuration helpers (`wolbarg init` output).
 */

export {
  EMBEDDING_PROVIDER_PRESETS,
  getEmbeddingProviderPreset,
  DEFAULT_SQLITE_DB_PATH,
  DEFAULT_ORGANIZATION,
  DEFAULT_CONFIG_PATH,
  DEFAULT_ENV_PATH,
  type EmbeddingProviderId,
  type EmbeddingProviderPreset,
} from "./providers.js";

export {
  defaultProjectConfig,
  loadProjectConfig,
  saveProjectConfig,
  resolveConfigPath,
  resolveEnvPath,
  resolveEmbeddingApiKey,
  upsertEnvVar,
  assertEmbeddingPreset,
  type WolbargProjectConfig,
  type WolbargProjectDatabaseConfig,
  type WolbargProjectEmbeddingConfig,
  type SaveProjectConfigOptions,
} from "./project-config.js";

export {
  createWolbargFromProjectConfig,
  projectConfigToWolbargOptions,
  applyEnvFile,
  type CreateFromProjectConfigOptions,
} from "./create-from-config.js";
