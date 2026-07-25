import { afterEach, describe, expect, it, vi } from "vitest";
import { Wolbarg, VersionConflictError } from "../src/index.js";
import { baseInitOptions, installFetchMock } from "./helpers.js";

describe("row_version CAS (1.2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects a stale expectedVersion and keeps the winning write", async () => {
    installFetchMock();
    const ctx = new Wolbarg();
    await ctx.init(baseInitOptions());

    const created = await ctx.remember({
      agent: "cas",
      content: { text: "original preference" },
      metadata: { theme: "light" },
    });
    expect(created.version).toBe(1);

    const first = await ctx.update({
      id: created.id,
      metadata: { theme: "dark" },
      expectedVersion: 1,
    });
    expect(first.version).toBe(2);
    expect(first.metadata.theme).toBe("dark");

    await expect(
      ctx.update({
        id: created.id,
        metadata: { theme: "solarized" },
        expectedVersion: 1,
      }),
    ).rejects.toBeInstanceOf(VersionConflictError);

    const history = await ctx.history({ id: created.id });
    expect(history.memory.metadata.theme).toBe("dark");
    expect(history.memory.version).toBe(2);

    await ctx.close();
  });

  it("allows last-writer-wins when expectedVersion is omitted", async () => {
    installFetchMock();
    const ctx = new Wolbarg();
    await ctx.init(baseInitOptions());

    const created = await ctx.remember({
      agent: "cas",
      content: { text: "lww memory" },
    });

    const a = await ctx.update({
      id: created.id,
      metadata: { n: 1 },
    });
    const b = await ctx.update({
      id: created.id,
      metadata: { n: 2 },
    });
    expect(a.version).toBe(2);
    expect(b.version).toBe(3);
    expect(b.metadata.n).toBe(2);

    await ctx.close();
  });
});
