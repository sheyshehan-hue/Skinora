import { Star } from "lucide-react";

export function Stars({ value, size = 12, count }: { value: number; size?: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} width={size} height={size} strokeWidth={1.2} className={i <= Math.round(value) ? "fill-champagne text-champagne" : "text-ink-300"} />
        ))}
      </span>
      {count !== undefined && <span className="text-[11px] text-ink-400">({count})</span>}
    </span>
  );
}
