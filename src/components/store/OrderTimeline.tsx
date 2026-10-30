import clsx from "clsx";
import { formatDate } from "@/lib/format";

const FLOW = ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] as const;
const LABEL: Record<string, string> = { CONFIRMED: "Confirmed", PACKED: "Packed", SHIPPED: "Out for delivery", DELIVERED: "Delivered" };

export function OrderTimeline({ status, events }: { status: string; events: { status: string; createdAt: Date; note: string | null }[] }) {
  if (status === "CANCELLED" || status === "RETURNED") return <p className="text-sm text-rosewood">This order was {status.toLowerCase()}.</p>;
  const idx = FLOW.indexOf(status as (typeof FLOW)[number]);
  return (
    <ol className="grid grid-cols-4">
      {FLOW.map((s, i) => {
        const ev = events.find((e) => e.status === s);
        const done = i <= idx;
        return (
          <li key={s} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={clsx("absolute right-1/2 top-[7px] h-px w-full", i <= idx ? "bg-champagne" : "bg-ink/15")} />}
            <span className={clsx("relative z-10 h-[15px] w-[15px] rounded-full border-2", done ? "border-champagne bg-champagne" : "border-ink/20 bg-ivory")} />
            <span className={clsx("mt-3 text-[10.5px] uppercase tracking-[0.14em]", done ? "text-ink" : "text-ink-400")}>{LABEL[s]}</span>
            {ev && <span className="mt-1 text-[11px] text-ink-400">{formatDate(ev.createdAt, { day: "numeric", month: "short" })}</span>}
          </li>
        );
      })}
    </ol>
  );
}
