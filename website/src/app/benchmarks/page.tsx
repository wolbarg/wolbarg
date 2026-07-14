import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { BenchmarkCharts } from "@/components/benchmarks/BenchmarkCharts";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/lib/site";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  createPageMetadata,
} from "@/lib/seo";
import {
  BENCHMARK_SUMMARY,
  BENCHMARKS_REPO,
  FEATURE_COLUMNS,
  FEATURE_LEGEND,
  KEY_STATS,
  PAGE_SECTIONS,
  PRODUCTS,
  featureMark,
  type FeatureValue,
} from "@/lib/comparison";

export const metadata: Metadata = createPageMetadata({
  title: `agentOrc Benchmarks — Public SDK Performance Numbers`,
  description:
    "Public agentOrc (AgentOrc) SDK benchmarks with interactive charts and an honest feature comparison against Chroma, Qdrant, LanceDB, and Mem0. Reproducible on your machine.",
  path: "/benchmarks",
  keywords: [
    ...siteConfig.keywords,
    "agentOrc benchmarks",
    "AI agent memory performance",
    "sqlite-vec benchmarks",
  ],
});

const FAQ = [
  {
    q: "Do these numbers measure SQLite alone?",
    a: "No. They measure the full agentOrc SDK path: embeddings, ACID writes, vector search, compression, and init.",
  },
  {
    q: "Why is mock mode the default?",
    a: "So anyone can reproduce results without paying for API calls. Use live mode with your own keys when you want real provider latency.",
  },
  {
    q: "Why don’t you publish competitor speed numbers?",
    a: "We only publish numbers we ran ourselves. Feature cells may show ❓ Unknown. We never invent latency or throughput for other tools.",
  },
  {
    q: "What does Active Memory Reduction mean?",
    a: "Compression shrinks the active working set. Archived memories stay on disk, so storage size does not shrink.",
  },
] as const;

function valueTone(value: FeatureValue): string {
  if (value === "Yes") return "text-foreground";
  if (value === "No") return "opacity-80";
  return "opacity-90";
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function BenchmarksPage() {
  return (
    <div className="relative">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Benchmarks", path: "/benchmarks" },
        ])}
      />
      <JsonLd data={buildFaqJsonLd(FAQ)} />
      {/* Hero */}
      <Section className="!pb-8 !pt-14 sm:!pt-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground">
              agentOrc · Benchmarks
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-[2.5rem] sm:leading-[1.15]">
              agentOrc benchmarks
              <span className="mt-1 block text-muted-foreground">
                Measured on the full SDK — not raw SQLite.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
              Public, reproducible numbers for startup, insert, search,
              concurrency, and storage — plus a feature comparison built only
              from verified public docs.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={BENCHMARKS_REPO}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Open GitHub suite
              </a>
              <a href="#charts" className="btn btn-secondary">
                Jump to charts
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
            {KEY_STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-card px-4 py-5 sm:px-5 sm:py-6"
              >
                <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 font-mono text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* Sticky section nav */}
      <div className="sticky top-14 z-30 border-y border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2.5 sm:px-6">
          {PAGE_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>

      {/* 1. Summary */}
      <Section id="summary" className="!pt-14">
        <Reveal>
          <SectionHeading
            eyebrow="01 · Summary"
            title="Headline results"
            description={`From the published suite · ${BENCHMARK_SUMMARY.generatedAt} · ${BENCHMARK_SUMMARY.mode} mode.`}
          />
        </Reveal>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="px-4 py-3 font-medium sm:px-5">Benchmark</th>
                <th className="px-4 py-3 font-medium sm:px-5">Dataset</th>
                <th className="px-4 py-3 font-medium sm:px-5">Result</th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_SUMMARY.rows.map((row, i) => (
                <tr
                  key={`${row.benchmark}-${row.dataset}`}
                  className={
                    i < BENCHMARK_SUMMARY.rows.length - 1
                      ? "border-b border-border/70"
                      : ""
                  }
                >
                  <td className="px-4 py-3.5 font-medium text-foreground sm:px-5">
                    {row.benchmark}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground sm:px-5">
                    {row.dataset}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-foreground sm:px-5">
                    {row.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 2. Charts */}
      <Section id="charts" className="border-t border-border !pt-14">
        <Reveal>
          <SectionHeading
            eyebrow="02 · Charts"
            title="How the suite scales"
            description="Interactive Recharts views of the same published run. Hover for exact values."
          />
        </Reveal>
        <BenchmarkCharts />
      </Section>

      {/* 3. Comparison */}
      <Section id="comparison" className="border-t border-border !pt-14">
        <Reveal>
          <SectionHeading
            eyebrow="03 · Comparison"
            title="Features, not invented timings"
            description={`${FEATURE_LEGEND}. From public docs only — no competitor latency claims.`}
          />
        </Reveal>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted/95 px-4 py-3 font-medium backdrop-blur sm:px-5">
                  Feature
                </th>
                {PRODUCTS.map((p) => (
                  <th
                    key={p.name}
                    className={`px-4 py-3 text-center font-medium sm:px-5 ${
                      p.highlight ? "text-foreground" : ""
                    }`}
                  >
                    <a
                      href={p.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_COLUMNS.map((col, i) => (
                <tr
                  key={col}
                  className={
                    i < FEATURE_COLUMNS.length - 1
                      ? "border-b border-border/70"
                      : ""
                  }
                >
                  <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium text-foreground sm:px-5">
                    {col}
                  </th>
                  {PRODUCTS.map((p) => {
                    const value = p.features[col];
                    return (
                      <td
                        key={`${p.name}-${col}`}
                        className={`px-4 py-3 text-center text-lg sm:px-5 ${valueTone(value)} ${
                          p.highlight ? "bg-foreground/[0.02]" : ""
                        }`}
                        title={value}
                      >
                        {featureMark(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Memory Compression means summarizing agent memories — not vector
          quantization. agentOrc storage is SQLite today; PostgreSQL is
          planned. Hybrid search (keyword + vector) is not in agentOrc v1.
        </p>
      </Section>

      {/* 4. Methodology */}
      <Section id="methodology" className="border-t border-border !pt-14">
        <Reveal>
          <SectionHeading
            eyebrow="04 · Methodology"
            title="What, why, and how — in plain English"
          />
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "What",
              d: "Each suite names one SDK operation: remember, recall, compress, or init.",
            },
            {
              t: "Why",
              d: "We explain why an agent host would care — writes, wait time, memory, or disk.",
            },
            {
              t: "How",
              d: "We fix dataset size, concurrency, and queries, then report average / p95 / p99 where it matters.",
            },
          ].map((item) => (
            <div key={item.t} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.t}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {item.d}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            Active memory reduction:
          </span>{" "}
          archived memories remain on disk. Storage size does not shrink. Only
          the active working set is reduced.
        </div>
      </Section>

      {/* 5. Hardware */}
      <Section id="hardware" className="border-t border-border !pt-14">
        <Reveal>
          <SectionHeading
            eyebrow="05 · Hardware"
            title="Published run environment"
          />
        </Reveal>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { k: "Platform", v: BENCHMARK_SUMMARY.platform },
            { k: "Mode", v: "Mock OpenAI-compatible embeddings (full SDK path)" },
            { k: "Adapter", v: "SQLite" },
            { k: "Suite date", v: BENCHMARK_SUMMARY.generatedAt },
            { k: "Package", v: "agentorc@0.1.x" },
            {
              k: "Source",
              v: (
                <a
                  href={BENCHMARKS_REPO}
                  className="text-foreground underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  agentorc-benchmarks
                </a>
              ),
            },
          ].map((item) => (
            <div key={item.k} className="rounded-xl border border-border bg-card px-5 py-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.k}
              </dt>
              <dd className="mt-2 text-sm text-foreground">{item.v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 6. FAQ */}
      <Section id="faq" className="border-t border-border !pt-14">
        <Reveal>
          <SectionHeading eyebrow="06 · FAQ" title="Common questions" />
        </Reveal>
        <dl className="max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
          {FAQ.map((item) => (
            <div key={item.q} className="px-5 py-5">
              <dt className="font-medium text-foreground">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 7. Reproduce */}
      <Section id="reproduce" className="border-t border-border !pt-14 !pb-24">
        <Reveal>
          <SectionHeading
            eyebrow="07 · Reproduce"
            title="Run the same suite locally"
            description="Node.js 22.5+. Default mock mode needs no API keys."
          />
          <pre className="overflow-x-auto rounded-xl border border-border bg-card p-5 font-mono text-sm leading-relaxed text-foreground">
            <code>{`git clone ${BENCHMARKS_REPO}.git
cd agentorc-benchmarks
npm install
npm run benchmark`}</code>
          </pre>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={BENCHMARKS_REPO}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Open benchmark repository
            </a>
            <Link href="/docs/introduction" className="btn btn-secondary">
              Read documentation
            </Link>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
