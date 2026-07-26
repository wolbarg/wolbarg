/**
 * File-level transfer must not leak other organizations' rows.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ValidationError,
  Wolbarg,
  openaiEmbedding,
} from "../src/index.js";
import { installFetchMock } from "./helpers.js";

describe("export/checkpoint multi-tenant gate", () => {
  let dir: string;
  const ctxs: Wolbarg[] = [];

  afterEach(async () => {
    for (const c of ctxs.splice(0)) {
      await c.close().catch(() => undefined);
    }
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  async function open(org: string, dbPath: string): Promise<Wolbarg> {
    installFetchMock();
    const ctx = new Wolbarg({
      organization: org,
      database: { provider: "sqlite", url: dbPath },
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      }),
      checkpointDirectory: path.join(dir, "checkpoints"),
    });
    await ctx.ready();
    ctxs.push(ctx);
    return ctx;
  }

  it("refuses export when the SQLite file holds another organization", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-xfer-"));
    const dbPath = path.join(dir, "shared.db");

    const a = await open("org-a", dbPath);
    await a.remember({ agent: "a", content: { text: "secret for A" } });
    await a.close();
    ctxs.pop();

    const b = await open("org-b", dbPath);
    await b.remember({ agent: "b", content: { text: "secret for B" } });

    await expect(b.export(path.join(dir, "leak.db"))).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(b.export(path.join(dir, "leak.db"))).rejects.toThrow(
      /multiple organizations/i,
    );
  });

  it("refuses checkpoint when the SQLite file holds another organization", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-cp-"));
    const dbPath = path.join(dir, "shared.db");

    const a = await open("org-a", dbPath);
    await a.remember({ agent: "a", content: { text: "A only" } });
    await a.close();
    ctxs.pop();

    const b = await open("org-b", dbPath);
    await b.remember({ agent: "b", content: { text: "B only" } });

    await expect(b.checkpoint("snap")).rejects.toBeInstanceOf(ValidationError);
  });

  it("allows export when the file contains only this organization", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-ok-"));
    const dbPath = path.join(dir, "solo.db");
    const ctx = await open("solo", dbPath);
    await ctx.remember({ agent: "a", content: { text: "only us" } });
    const exported = await ctx.export(path.join(dir, "out.db"));
    expect(fs.existsSync(exported.path)).toBe(true);
    expect(exported.path.endsWith(".db")).toBe(true);
  });
});
