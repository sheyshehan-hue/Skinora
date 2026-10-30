import clsx from "clsx";
import { formatLKR } from "@/lib/format";

export function Price({ price, compareAt, className, from }: { price: number; compareAt?: number | null; className?: string; from?: boolean }) {
  return (
    <span className={clsx("inline-flex items-baseline gap-2", className)}>
      {from && <span className="text-[11px] uppercase tracking-wider text-ink-400">From</span>}
      <span className={clsx(compareAt && "text-rosewood")}>{formatLKR(price)}</span>
      {compareAt ? <s className="text-ink-400 text-[0.85em]">{formatLKR(compareAt)}</s> : null}
    </span>
  );
}
