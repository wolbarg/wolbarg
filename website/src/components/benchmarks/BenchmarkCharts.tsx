"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CHART_SERIES } from "@/lib/comparison";

const barConfig = {
  value: { label: "Value", color: "var(--foreground)" },
} satisfies ChartConfig;

const dualConfig = {
  top5: { label: "Top-5", color: "var(--foreground)" },
  top10: {
    label: "Top-10",
    color: "color-mix(in oklab, var(--foreground) 62%, transparent)",
  },
  top20: {
    label: "Top-20",
    color: "color-mix(in oklab, var(--foreground) 32%, transparent)",
  },
} satisfies ChartConfig;

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-h-[220px] flex-1">{children}</div>
    </div>
  );
}

function SimpleBar({
  data,
  format,
}: {
  data: ReadonlyArray<{ label: string; value: number }>;
  format: (v: number) => string;
}) {
  return (
    <ChartContainer config={barConfig} className="aspect-auto h-[220px] w-full">
      <BarChart
        data={[...data]}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          width={52}
          tickFormatter={(v) => format(Number(v))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent formatter={(value) => format(Number(value))} />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function fmtOps(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}
function fmtMs(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}`;
}
function fmtMb(v: number) {
  return `${v.toFixed(0)}`;
}
function fmtPct(v: number) {
  return `${v.toFixed(0)}%`;
}

export function BenchmarkCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Startup time"
        description="Cold vs warm init() latency in milliseconds."
      >
        <SimpleBar data={CHART_SERIES.startup} format={fmtMs} />
      </ChartCard>

      <ChartCard
        title="Insert throughput"
        description="remember() ops per second across dataset sizes."
      >
        <SimpleBar data={CHART_SERIES.insert} format={fmtOps} />
      </ChartCard>

      <ChartCard
        title="Search latency"
        description="Average recall() latency as the corpus grows."
      >
        <SimpleBar data={CHART_SERIES.search} format={fmtMs} />
      </ChartCard>

      <ChartCard
        title="Retrieval latency"
        description="Top-5 / top-10 / top-20 average latency by corpus size."
      >
        <ChartContainer config={dualConfig} className="aspect-auto h-[220px] w-full">
          <BarChart
            data={[...CHART_SERIES.retrieval]}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} fontSize={11} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              width={52}
              tickFormatter={(v) => fmtMs(Number(v))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent formatter={(value) => fmtMs(Number(value))} />
              }
            />
            <Bar dataKey="top5" fill="var(--color-top5)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="top10" fill="var(--color-top10)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="top20" fill="var(--color-top20)" radius={[3, 3, 0, 0]} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="Concurrency throughput"
        description="Parallel writers sharing one AgentOrc client."
      >
        <SimpleBar data={CHART_SERIES.concurrency} format={fmtOps} />
      </ChartCard>

      <ChartCard
        title="Database size"
        description="On-disk SQLite size in megabytes."
      >
        <SimpleBar data={CHART_SERIES.databaseSizeMb} format={(v) => `${fmtMb(v)} MB`} />
      </ChartCard>

      <ChartCard
        title="Memory usage"
        description="Process heap used across workload stages (MB)."
      >
        <ChartContainer config={barConfig} className="aspect-auto h-[220px] w-full">
          <LineChart
            data={[...CHART_SERIES.memoryHeapMb]}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} fontSize={11} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              width={40}
              tickFormatter={(v) => fmtMb(Number(v))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => `${Number(value).toFixed(1)} MB`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-value)" }}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="Active memory reduction"
        description="Working-set reduction after compress(). Disk size does not shrink."
      >
        <SimpleBar data={CHART_SERIES.compressionPct} format={fmtPct} />
      </ChartCard>
    </div>
  );
}
