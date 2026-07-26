import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SQLITE_DB_PATH,
  getEmbeddingProviderPreset,
  loadProjectConfig,
  saveProjectConfig,
} from "../src/config/index.js";
import {
  buildConfigFromFlags,
  parseInitArgs,
  runInit,
} from "../src/cli/init.js";

describe("embedding provider presets", () => {
  it("exposes visible default base URLs per provider", () => {
    const openai = getEmbeddingProviderPreset("openai");
    expect(openai?.defaultBaseUrl).toBe("https://api.openai.com/v1");
    expect(openai?.defaultModel).toBe("text-embedding-3-small");

    const ollama = getEmbeddingProviderPreset("ollama");
    expect(ollama?.defaultBaseUrl).toBe("http://127.0.0.1:11434/v1");
  });
});

describe("wolbarg init config", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  function tmp() {
    const d = mkdtempSync(join(tmpdir(), "wolbarg-init-"));
    dirs.push(d);
    return d;
  }

  it("writes default sqlite path and explicit openai base URL with --yes", async () => {
    const cwd = tmp();
    const code = await runInit({
      cwd,
      yes: true,
      force: true,
      apiKey: "sk-test",
    });
    expect(code).toBe(0);

    const config = loadProjectConfig(cwd);
    expect(config?.database.url).toBe(DEFAULT_SQLITE_DB_PATH);
    expect(config?.database.provider).toBe("sqlite");
    expect(config?.embedding?.provider).toBe("openai");
    expect(config?.embedding?.baseUrl).toBe("https://api.openai.com/v1");
    expect(config?.embedding?.model).toBe("text-embedding-3-small");
    expect(config?.embedding?.apiKeyEnv).toBe("OPENAI_API_KEY");

    const envPath = join(cwd, ".wolbarg", ".env");
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, "utf8")).toContain("OPENAI_API_KEY=sk-test");
    expect(existsSync(join(cwd, ".wolbarg", "shared-memory"))).toBe(true);
  });

  it("stores provider default base URL even when not overridden", () => {
    const cfg = buildConfigFromFlags({
      provider: "ollama",
      yes: true,
    });
    expect(cfg.embedding?.baseUrl).toBe("http://127.0.0.1:11434/v1");
    expect(cfg.embedding?.model).toBe("nomic-embed-text");
  });

  it("allows skipping embedding", async () => {
    const cwd = tmp();
    const code = await runInit({
      cwd,
      yes: true,
      force: true,
      skipEmbedding: true,
    });
    expect(code).toBe(0);
    const config = loadProjectConfig(cwd);
    expect(config?.embedding).toBeUndefined();
    expect(config?.database.url).toBe(DEFAULT_SQLITE_DB_PATH);
  });

  it("parses init flags", () => {
    const opts = parseInitArgs([
      "--yes",
      "--provider",
      "gemini",
      "--base-url",
      "https://example.com/v1",
      "--model",
      "text-embedding-004",
    ]);
    expect("help" in opts).toBe(false);
    if (!("help" in opts)) {
      expect(opts.yes).toBe(true);
      expect(opts.provider).toBe("gemini");
      expect(opts.baseUrl).toBe("https://example.com/v1");
      expect(opts.model).toBe("text-embedding-004");
    }
  });

  it("save/load round-trips custom base URL", () => {
    const cwd = tmp();
    const config = buildConfigFromFlags({
      provider: "custom",
      baseUrl: "https://my-proxy.example.com/v1",
      model: "my-embed",
      apiKeyEnv: "MY_KEY",
    });
    saveProjectConfig(config, { cwd, overwrite: true });
    const loaded = loadProjectConfig(cwd);
    expect(loaded?.embedding?.baseUrl).toBe("https://my-proxy.example.com/v1");
    expect(loaded?.embedding?.model).toBe("my-embed");
  });
});
