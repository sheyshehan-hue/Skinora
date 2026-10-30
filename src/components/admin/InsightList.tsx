import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Info, OctagonAlert, Sparkles, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/insights";

const ICON = { critical: OctagonAlert, serious: AlertTriangle, warning: AlertTriangle, good: TrendingUp, info: Info };
const TONE = { critical: "text-[#d03b3b] bg-[#d03b3b]/10", serious: "text-[#c8612f] bg-[#ec835a]/15", warning: "text-[#a67400] bg-[#fab219]/20", good: "text-[#0a7f0a] bg-[#0ca30c]/10", info: "text-[#1c5cab] bg-[#2a78d6]/10" };
const LABEL = { critical: "Critical", serious: "Act soon", warning: "Watch", good: "Opportunity", info: "Forecast" };

export function InsightList({ items, compact }: { items: Insight[]; compact?: boolean }) {
  if (!items.length) return <p className="flex items-center gap-2 text-sm text-ink-500"><Sparkles width={16} /> All clear. Nothing needs attention.</p>;
  return (
    <ul className="divide-y divide-ink/[0.06]">
      {items.map((i) => {
        const Icon = ICON[i.tone];
        return (
          <li key={i.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
            <span className={clsx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", TONE[i.tone])}><Icon width={16} strokeWidth={1.8} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{i.title}</p>
              {!compact && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{i.detail}</p>}
              <p className="mt-1 flex items-center gap-3 text-[11px]">
                <span className={clsx("font-medium", TONE[i.tone].split(" ")[0])}>{LABEL[i.tone]}</span>
                {i.href && <Link href={i.href} className="inline-block py-1 text-ink-500 underline-offset-2 hover:text-ink hover:underline">{i.action ?? "Open"} →</Link>}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
