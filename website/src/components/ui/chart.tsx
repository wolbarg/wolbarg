"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
}: {
  id?: string;
  className?: string;
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/40 [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: colorConfig
          .map(
            ([key, item]) => `
[data-chart=${id}] {
  --color-${key}: ${item.color};
}
`,
          )
          .join("\n"),
      }}
    />
  );
}

export function ChartTooltip(
  props: React.ComponentProps<typeof RechartsPrimitive.Tooltip>,
) {
  return <RechartsPrimitive.Tooltip {...props} />;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  formatter,
  hideLabel,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    dataKey?: string | number;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  className?: string;
  hideLabel?: boolean;
  formatter?: (
    value: number | string,
    name: string,
  ) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-36 gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm",
        className,
      )}
    >
      {!hideLabel && label ? (
        <div className="font-medium text-foreground">{label}</div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "value");
          const itemConfig = config[key];
          const display =
            formatter && item.value != null
              ? formatter(item.value, key)
              : item.value;

          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: item.color ?? itemConfig?.color }}
                />
                <span>{itemConfig?.label ?? item.name ?? key}</span>
              </div>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  payload,
  className,
}: {
  payload?: Array<{ value?: string; color?: string; dataKey?: string }>;
  className?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 pt-2", className)}>
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value);
        const itemConfig = config[key];
        return (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: item.color ?? itemConfig?.color }}
            />
            {itemConfig?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}
