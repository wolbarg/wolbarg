import type { Metadata } from "next";
import Link from "next/link";
import {
  Code2,
  Database,
  HardDrive,
  Network,
  Search,
  Shield,
} from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Section } from "@/components/ui/Section";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { Reveal } from "@/components/motion/Reveal";
import { FeatureMotion } from "@/components/motion/HomeMotion";
import {
  BENCHMARK_SUMMARY,
  FEATURE_COLUMNS,
  FEATURE_LEGEND,
  PRODUCTS,
  featureMark,
} from "@/lib/comparison";
import { createPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

const features = [
  {
    title: "Local-first",
    description:
      "Everything lives in a SQLite file on disk. No hosted vector DB, no cloud dependency for the memory layer.",
    icon: HardDrive,
  },
  {
    title: "Semantic recall",
    description:
      "Agents ask in natural language. agentOrc embeds the query and returns the closest memories by meaning.",
    icon: Search,
  },
  {
    title: "Multi-agent by design",
    description:
      "Many agents can write and read the same store safely. WAL mode and transactions handle concurrency.",
    icon: Network,
  },
  {
    title: "SQLite + sqlite-vec",
    description:
      "Durable storage with an in-process vector index. Back it up like any other database file.",
    icon: Database,
  },
  {
    title: "Tiny API",
    description:
      "remember, recall, compress, forget, history, stats. Easy to drop into an existing agent loop.",
    icon: Code2,
  },
  {
    title: "Zero infrastructure",
    description:
      "No Redis cluster, no queue, no sidecar. Install the package and point it at a file path.",
    icon: Shield,
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <Section>
        <Reveal>
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground">
              Why it exists
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Agents forget. Shared state gets messy.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Most multi-agent setups store knowledge in process memory, JSON
              files, or a generic key-value store. That works until you need
              persistence, concurrency, and search by meaning — not just by key.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
          <Reveal delay={0.05}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Without agentOrc
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li>Each agent keeps its own isolated context</li>
                <li>Developers invent shared state with globals or Redis</li>
                <li>JSON dumps become the source of truth</li>
                <li>No semantic search across what agents learned</li>
                <li>Concurrency and crash safety are DIY</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="rounded-xl border border-neutral-700 bg-neutral-800 p-6 text-neutral-200 dark:border-neutral-400 dark:bg-neutral-300 dark:text-neutral-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
                With agentOrc
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-neutral-300 dark:text-neutral-700">
                <li>One shared semantic memory for the whole system</li>
                <li>SQLite persistence with WAL and ACID writes</li>
                <li>Natural-language recall via embeddings</li>
                <li>A small, stable TypeScript API</li>
                <li>Runs locally with zero infrastructure</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>

      <HowItWorks />

      <Section>
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              Core features
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for real agent systems
            </h2>
          </div>
        </Reveal>
        <FeatureMotion>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} data-feature-item className="group">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card transition-transform duration-200 group-hover:-translate-y-0.5">
                  <feature.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="text-[0.95rem] font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </FeatureMotion>
      </Section>

      <Section className="border-y border-border">
        <Reveal>
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              Performance
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Benchmarked as a selling point — not an afterthought
            </h2>
            <p className="mt-3 text-muted-foreground">
              Full SDK path. Public repo. Reproducible on your machine.
            </p>
          </div>
        </Reveal>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Benchmark</th>
                <th className="py-3 pr-4 font-medium">Dataset</th>
                <th className="py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_SUMMARY.rows.slice(0, 6).map((row) => (
                <tr
                  key={`${row.benchmark}-${row.dataset}`}
                  className="border-b border-border/70"
                >
                  <td className="py-3 pr-4 font-medium">{row.benchmark}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {row.dataset}
                  </td>
                  <td className="py-3 font-mono">{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-10">
          <p className="text-sm font-medium text-muted-foreground">
            Feature comparison
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {FEATURE_LEGEND}. No invented competitor timings.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-3 pr-3 font-medium">Feature</th>
                  {PRODUCTS.map((p) => (
                    <th key={p.name} className="py-3 pr-3 font-medium">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_COLUMNS.filter((c) =>
                  [
                    "Local-first",
                    "SQLite-based",
                    "Memory Compression",
                    "Semantic Search",
                    "Hybrid Search",
                    "Open Source",
                    "Public Benchmark Repo",
                  ].includes(c),
                ).map((col) => (
                  <tr key={col} className="border-b border-border/70">
                    <th className="py-3 pr-3 text-left font-medium">{col}</th>
                    {PRODUCTS.map((p) => (
                      <td
                        key={`${p.name}-${col}`}
                        className="py-3 pr-3 text-center text-base"
                        title={p.features[col]}
                      >
                        {featureMark(p.features[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-8">
          <Link href="/benchmarks" className="btn btn-secondary">
            View full benchmarks
          </Link>
        </div>
      </Section>

      <Section className="border-y border-border bg-surface/50">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Install and go
            </h2>
            <p className="mt-3 text-muted-foreground">
              One dependency. Point it at a SQLite path and an OpenAI-compatible
              embedding endpoint.
            </p>
            <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-lg border border-border bg-code">
              <pre className="px-4 py-3 font-mono text-sm text-code-foreground">
                <span className="select-none text-muted-foreground">$ </span>
                npm install agentorc
              </pre>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/docs/installation" className="btn btn-primary">
                Setup Guide
              </Link>
              <Link href="/docs/quick-start" className="btn btn-secondary">
                Quick Start
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card px-6 py-8 sm:flex-row sm:items-center sm:px-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Read the docs
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                API reference, configuration, concurrency notes, and guides for
                shared multi-agent memory.
              </p>
            </div>
            <Link href="/docs/introduction" className="btn btn-primary shrink-0">
              Open Documentation
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
