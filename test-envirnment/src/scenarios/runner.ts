import type { AgentOrc } from "agentorc";
import type { AppConfig } from "../config.js";
import type { MemoryAgent } from "../agents/memory-agent.js";

export type StepStatus = "pass" | "fail" | "skip";

export interface StepResult {
  name: string;
  status: StepStatus;
  detail?: string;
  ms: number;
}

export class ScenarioRunner {
  private readonly results: StepResult[] = [];

  async step(name: string, fn: () => Promise<void> | void): Promise<void> {
    const started = Date.now();
    process.stdout.write(`  → ${name} ... `);
    try {
      await fn();
      const ms = Date.now() - started;
      this.results.push({ name, status: "pass", ms });
      console.log(`PASS (${ms}ms)`);
    } catch (error) {
      const ms = Date.now() - started;
      const detail = error instanceof Error ? error.message : String(error);
      this.results.push({ name, status: "fail", detail, ms });
      console.log(`FAIL (${ms}ms)`);
      console.log(`     ${detail}`);
    }
  }

  skip(name: string, reason: string): void {
    this.results.push({ name, status: "skip", detail: reason, ms: 0 });
    console.log(`  → ${name} ... SKIP (${reason})`);
  }

  assert(condition: unknown, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  summary(): {
    passed: number;
    failed: number;
    skipped: number;
    results: StepResult[];
  } {
    const passed = this.results.filter((r) => r.status === "pass").length;
    const failed = this.results.filter((r) => r.status === "fail").length;
    const skipped = this.results.filter((r) => r.status === "skip").length;
    return { passed, failed, skipped, results: this.results };
  }
}

export interface SuiteContext {
  memory: AgentOrc;
  agentA: MemoryAgent;
  agentB: MemoryAgent;
  config: AppConfig;
  runner: ScenarioRunner;
}
