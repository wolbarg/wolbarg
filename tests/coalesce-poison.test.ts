import { afterEach, describe, expect, it, vi } from "vitest";
import { SqliteStorageProvider } from "../src/storage/providers/sqlite.js";
import type { InsertMemoryInput } from "../src/storage/types.js";

function validInput(
  id: string,
  text: string,
  embedding = Float32Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]),
): InsertMemoryInput {
  const now = new Date().toISOString();
  return {
    id,
    organization: "poison-org",
    agent: "writer",
    contentText: text,
    metadata: {},
    embedding,
    createdAt: now,
    updatedAt: now,
    contentHash: null,
  };
}

describe("coalescer poison-batch isolation (1.6)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("commits valid rows when one coalesced peer fails", async () => {
    const storage = new SqliteStorageProvider({ connectionString: ":memory:" });
    await storage.open();
    await storage.ensureVectorSchema(8);

    // Force the multi-row batch path to fail, then per-row retry.
    vi.spyOn(storage, "insertMemoriesBatch").mockRejectedValue(
      new Error("simulated coalesced batch failure"),
    );

    // Make the poison row fail on the per-row path too.
    const proto = storage as unknown as {
      insertEmbedding: (rowid: number, embedding: Float32Array) => void;
    };
    const originalEmbed = proto.insertEmbedding.bind(storage);
    proto.insertEmbedding = (rowid: number, embedding: Float32Array) => {
      if (embedding.length === 2) {
        throw new Error("poison embedding rejected");
      }
      return originalEmbed(rowid, embedding);
    };

    const goodA = validInput(crypto.randomUUID(), "good memory A");
    const goodB = validInput(crypto.randomUUID(), "good memory B");
    const bad = validInput(
      crypto.randomUUID(),
      "poison",
      Float32Array.from([1, 2]),
    );

    const results = await Promise.allSettled([
      storage.insertMemory(goodA),
      storage.insertMemory(bad),
      storage.insertMemory(goodB),
    ]);

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(2);
    expect(rejected.length).toBe(1);

    const listed = await storage.listMemories({
      organization: "poison-org",
      agent: "writer",
    });
    expect(listed.map((r) => r.content_text).sort()).toEqual([
      "good memory A",
      "good memory B",
    ]);

    await storage.close();
  });
});
