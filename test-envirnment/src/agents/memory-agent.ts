import type {
  AgentOrc,
  CompressResult,
  MemoryMetadata,
  MemoryRecord,
  RecallResult,
} from "agentorc";

/**
 * Thin agent wrapper around a shared AgentOrc instance.
 */
export class MemoryAgent {
  constructor(
    readonly name: string,
    private readonly memory: AgentOrc,
  ) {}

  async write(
    text: string,
    metadata: MemoryMetadata = {},
  ): Promise<MemoryRecord> {
    return this.memory.remember({
      agent: this.name,
      content: { text },
      metadata: {
        ...metadata,
        writtenBy: this.name,
      },
    });
  }

  async read(
    query: string,
    options: {
      topK?: number;
      threshold?: number;
      includeArchived?: boolean;
      hybrid?: boolean;
    } = {},
  ): Promise<RecallResult[]> {
    return this.memory.recall({
      query,
      topK: options.topK ?? 5,
      threshold: options.threshold ?? 0.2,
      hybrid: options.hybrid,
      filter: {
        agent: this.name,
        includeArchived: options.includeArchived ?? false,
      },
    });
  }

  async readShared(
    query: string,
    options: { topK?: number; threshold?: number; hybrid?: boolean } = {},
  ): Promise<RecallResult[]> {
    return this.memory.recall({
      query,
      topK: options.topK ?? 5,
      threshold: options.threshold ?? 0.2,
      hybrid: options.hybrid,
    });
  }

  async compress(): Promise<CompressResult> {
    return (this.memory as unknown as AgentOrc<true>).compress({
      agent: this.name,
    });
  }

  async forgetAll(): Promise<number> {
    return this.memory.forget({ filter: { agent: this.name } });
  }
}
