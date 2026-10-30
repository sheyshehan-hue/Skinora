import { Clock3, ShieldCheck } from "lucide-react";

/** Thin status strip above every page: data freshness, currency and locale, who is signed in. */
export function Topbar({ name, role }: { name: string; role: string }) {
  const now = new Date();
  const stamp = now.toLocaleString("en-GB", { timeZone: "Asia/Colombo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const initials = name.replace(/[^A-Za-z ]/g, "").trim().split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="sticky top-0 z-20 hidden h-12 items-center justify-between border-b border-[var(--adm-line)] bg-[var(--adm-bg)]/90 px-8 text-[11px] text-[var(--adm-t3)] backdrop-blur lg:flex" data-sk-topbar>
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--adm-good)] shadow-[0_0_8px_var(--adm-good)]" />Live data · as of {stamp}</span>
        <span className="flex items-center gap-1.5"><ShieldCheck width={12} strokeWidth={1.6} />Activity logged</span>
      </div>
      <div className="flex items-center gap-5">
        <span className="font-mono tracking-[0.08em]">LKR · Asia/Colombo</span>
        <span className="flex items-center gap-1.5"><Clock3 width={12} strokeWidth={1.6} />Reports refresh hourly</span>
        <span className="flex items-center gap-2 border-l border-[var(--adm-line)] pl-5 text-[var(--adm-t2)]">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--adm-gold)] text-[10px] font-semibold text-[#0B0E14]">{initials}</span>
          {name} <span className="text-[var(--adm-t4)]">· {role}</span>
        </span>
      </div>
    </div>
  );
}
