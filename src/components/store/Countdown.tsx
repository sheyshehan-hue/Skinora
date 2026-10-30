"use client";
import { useEffect, useState } from "react";

export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(to).getTime() - (now ?? new Date(to).getTime()));
  const parts = [Math.floor(ms / 3.6e6), Math.floor(ms / 6e4) % 60, Math.floor(ms / 1000) % 60];
  return (
    <span className={`inline-flex gap-3 font-serif tabular-nums ${className}`}>
      {parts.map((p, i) => (
        <span key={i} className="flex flex-col items-center">
          <span className="text-4xl">{now === null ? "––" : String(p).padStart(2, "0")}</span>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ink-500">{["Hours", "Min", "Sec"][i]}</span>
        </span>
      ))}
    </span>
  );
}
