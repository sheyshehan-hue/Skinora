import { ShieldCheck } from "lucide-react";

export function AuthenticBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border border-champagne/50 bg-champagne-50 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.16em] text-champagne-700 ${className}`}>
      <ShieldCheck width={13} height={13} strokeWidth={1.4} /> 100% Authentic
    </span>
  );
}
