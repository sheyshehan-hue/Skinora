"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Chart tokens (validated categorical palette; single-series charts use slot 1). */
/* Dark-surface steps of the validated categorical palette (checked with the dataviz validator against #131720). */
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const GRID = "rgba(255,255,255,0.07)";
const AXIS = { fontSize: 11, fill: "#646D82" };

const lkrShort = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v));
const lkr = (v: number) => `LKR ${Math.round(v).toLocaleString("en-LK")}`;
const fmtDate = (iso: string, bucket: string) =>
  new Date(iso).toLocaleDateString("en-GB", bucket === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });

function TipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-md border border-[var(--adm-line2)] bg-[#1A1F2B] px-3 py-2 text-xs text-[var(--adm-t1)] shadow-xl">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-[var(--adm-t3)]">
          {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          <span>{r.label}</span>
          <span className="ml-auto pl-4 font-medium tabular-nums text-[var(--adm-t1)]">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ points, bucket, height = 280, showProfit = true }: { points: { date: string; revenue: number; profit: number; orders: number }[]; bucket: string; height?: number; showProfit?: boolean }) {
  return (
    <div>
      {showProfit && (
        <div className="mb-3 flex gap-4 text-xs text-ink-600">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: SERIES[0] }} />Revenue</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: SERIES[1] }} />Gross profit</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, bucket)} tick={AXIS} axisLine={false} tickLine={false} minTickGap={32} />
          <YAxis tickFormatter={lkrShort} tick={AXIS} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.25)", strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox
                  title={fmtDate(String(payload[0].payload.date), bucket === "month" ? "month" : "day")}
                  rows={[
                    { label: "Revenue", value: lkr(payload[0].payload.revenue), color: SERIES[0] },
                    ...(showProfit ? [{ label: "Gross profit", value: lkr(payload[0].payload.profit), color: SERIES[1] }] : []),
                    { label: "Orders", value: String(payload[0].payload.orders) },
                  ]}
                />
              ) : null
            }
          />
          <Area type="monotone" dataKey="revenue" stroke={SERIES[0]} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 4, strokeWidth: 2, stroke: "#131720" }} />
          {showProfit && <Area type="monotone" dataKey="profit" stroke={SERIES[1]} strokeWidth={2} fill="none" activeDot={{ r: 4, strokeWidth: 2, stroke: "#131720" }} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastChart({ history, forecast }: { history: { week: string; revenue: number }[]; forecast: { week: string; revenue: number; low: number; high: number }[] }) {
  const data = [
    ...history.map((h, i) => ({ week: h.week, actual: h.revenue, forecast: i === history.length - 1 ? h.revenue : undefined, band: i === history.length - 1 ? [h.revenue, h.revenue] : undefined })),
    ...forecast.map((f) => ({ week: f.week, forecast: f.revenue, band: [Math.max(0, f.low), f.high] })),
  ];
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-ink-600">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: SERIES[0] }} />Actual</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed" style={{ borderColor: SERIES[1] }} />Forecast</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: SERIES[1], opacity: 0.15 }} />Likely range</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tickFormatter={(d) => fmtDate(d, "day")} tick={AXIS} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tickFormatter={lkrShort} tick={AXIS} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <TipBox
                  title={`Week of ${fmtDate(p.week, "day")}`}
                  rows={[
                    ...(p.actual !== undefined ? [{ label: "Actual", value: lkr(p.actual), color: SERIES[0] }] : []),
                    ...(p.forecast !== undefined && p.actual === undefined ? [{ label: "Forecast", value: lkr(p.forecast), color: SERIES[1] }, { label: "Range", value: `${lkrShort(p.band[0])}–${lkrShort(p.band[1])}` }] : []),
                  ]}
                />
              );
            }}
          />
          <Area dataKey="band" stroke="none" fill={SERIES[1]} fillOpacity={0.12} />
          <Line dataKey="actual" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line dataKey="forecast" stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyBars({ data, highlight }: { data: { month: string; revenue: number }[]; highlight?: number[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={4}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={(d) => fmtDate(d, "month")} tick={AXIS} axisLine={false} tickLine={false} interval={1} />
        <YAxis tickFormatter={lkrShort} tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={({ active, payload }) => (active && payload?.length ? <TipBox title={fmtDate(String(payload[0].payload.month), "month")} rows={[{ label: "Revenue", value: lkr(Number(payload[0].value)) }]} /> : null)} />
        <Bar
          dataKey="revenue"
          radius={[4, 4, 0, 0]}
          shape={(props: unknown) => {
            const p = props as { x: number; y: number; width: number; height: number; payload: { month: string } };
            const m = new Date(p.payload.month).getMonth();
            const hot = highlight?.includes(m);
            return <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={4} fill={hot ? SERIES[1] : SERIES[0]} opacity={hot ? 1 : 0.85} />;
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars built in HTML: crisp labels, works at any width. */
export function BarList({ rows, format = "lkr", color = SERIES[0] }: { rows: { label: string; value: number; sub?: string }[]; format?: "lkr" | "num" | "pct"; color?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const fmt = (v: number) => (format === "lkr" ? lkr(v) : format === "pct" ? `${(v * 100).toFixed(1)}%` : v.toLocaleString());
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${fmt(r.value)}`}>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="truncate text-ink-700">{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink">{fmt(r.value)}{r.sub && <span className="ml-1.5 text-ink-400">{r.sub}</span>}</span>
          </div>
          <div className="h-1.5 rounded-sm bg-white/[0.06]">
            <div className="h-full rounded-sm transition-all group-hover:opacity-80" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Sparkline({ values, color = SERIES[0] }: { values: number[]; color?: string }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.08} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
