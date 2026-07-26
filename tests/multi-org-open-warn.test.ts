/**
 * Multi-org SQLite open warns (export still refuses).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Wolbarg, openaiEmbedding, sqlite } from "../src/index.js";
import { fakeEmbedding } from "./helpers.js";

describe("multi-org SQLite open warning", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("warns when opening a file that already holds multiple organizations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url.includes("/embeddings")) {
          const body = init?.body
            ? (JSON.parse(String(init.body)) as { input?: string | string[] })
            : {};
          const text = Array.isArray(body.input)
            ? body.input[0] ?? ""
            : body.input ?? "";
          return new Response(
            JSON.stringify({ data: [{ embedding: fakeEmbedding(text) }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-multi-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "shared.db");

    const a = new Wolbarg({
      organization: "org-a",
      storage: sqlite(dbPath),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });
    const b = new Wolbarg({
      organization: "org-b",
      storage: sqlite(dbPath),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });
    await a.ready();
    await a.remember({ agent: "x", content: { text: "a secret" } });
    await a.close();
    await b.ready();
    await b.remember({ agent: "x", content: { text: "b secret" } });
    await b.close();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const again = new Wolbarg({
      organization: "org-a",
      storage: sqlite(dbPath),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });
    await again.ready();
    expect(
      warn.mock.calls.some((c) =>
        String(c[0] ?? "").includes("organizations"),
      ),
    ).toBe(true);
    await again.close();
  });
});
