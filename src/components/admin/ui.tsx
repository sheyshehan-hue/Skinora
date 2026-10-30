import Link from "next/link";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-medium tracking-[-0.01em] text-[var(--adm-t1)]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-[var(--adm-t3)]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** KPI tile: label, a large tabular figure, and the change against the prior period as a signed pill. */
export function Stat({ label, value, delta, hint, invert }: { label: string; value: string; delta?: number | null; hint?: string; invert?: boolean }) {
  const has = delta !== null && delta !== undefined;
  const good = !has ? null : invert ? delta < 0 : delta >= 0;
  return (
    <div className="card relative overflow-hidden p-5">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--adm-t3)]">{label}</p>
      <p className="mt-3 text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[var(--adm-t1)] sm:text-[30px]">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {has && (
          <span className={clsx("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums", good ? "bg-[rgba(63,197,154,0.14)] text-[var(--adm-good)]" : "bg-[rgba(240,128,128,0.14)] text-[var(--adm-bad)]")}>
            {delta >= 0 ? <ArrowUpRight width={12} /> : <ArrowDownRight width={12} />}
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-[var(--adm-t4)]">{hint}</span>}
      </div>
    </div>
  );
}

export function Card({ title, subtitle, action, children, className, pad = true }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={clsx("card", className)}>
      {title && (
        <header className="flex items-start justify-between gap-4 border-b border-[var(--adm-line)] px-5 py-4">
          <div>
            <h2 className="text-[13px] font-medium text-[var(--adm-t1)]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-[var(--adm-t4)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? "p-5" : "pt-1"}>{children}</div>
    </section>
  );
}

export const STATUS_STYLE: Record<string, string> = {
  critical: "bg-[rgba(240,128,128,0.14)] text-[var(--adm-bad)]",
  serious: "bg-[rgba(242,162,115,0.14)] text-[#F2A273]",
  warning: "bg-[rgba(233,191,94,0.16)] text-[var(--adm-warn)]",
  good: "bg-[rgba(63,197,154,0.14)] text-[var(--adm-good)]",
  info: "bg-[rgba(127,176,245,0.14)] text-[var(--adm-info)]",
  neutral: "bg-white/[0.06] text-[var(--adm-t2)]",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof STATUS_STYLE | string; children: React.ReactNode }) {
  return <span className={clsx("badge", STATUS_STYLE[tone] ?? STATUS_STYLE.neutral)}>{children}</span>;
}

const ORDER_TONE: Record<string, string> = { PENDING_PAYMENT: "warning", CONFIRMED: "info", PACKED: "info", SHIPPED: "info", DELIVERED: "good", CANCELLED: "neutral", RETURNED: "serious" };
export function OrderBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={ORDER_TONE[status]}>{label}</Badge>;
}

export function RangeTabs({ value, base, ranges = ["30d", "90d", "12m", "all"] }: { value: string; base: string; ranges?: string[] }) {
  const labels: Record<string, string> = { "30d": "30 days", "90d": "90 days", "12m": "12 months", all: "All time" };
  return (
    <div className="inline-flex rounded-md border border-[var(--adm-line2)] bg-[var(--adm-panel)] p-0.5">
      {ranges.map((r) => (
        <Link key={r} href={`${base}${base.includes("?") ? "&" : "?"}range=${r}`} className={clsx("rounded px-3 py-2.5 text-[11px] font-medium transition lg:py-1.5", value === r ? "bg-white/[0.09] text-[var(--adm-t1)]" : "text-[var(--adm-t3)] hover:text-[var(--adm-t1)]")}>
          {labels[r]}
        </Link>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-[var(--adm-t4)]">{children}</p>;
}
