import { StaffLoginForm } from "@/components/admin/StaffLoginForm";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Staff sign in", robots: { index: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="adm grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--adm-line)] bg-[#0E1119] p-14 lg:flex">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(212,179,106,0.16),transparent_60%)]" />
        <div>
          <p className="wordmark text-2xl">SKINORA</p>
          <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.22em] text-[var(--adm-gold)]">Operations workspace</p>
        </div>
        <div>
          <p className="text-[44px] font-medium leading-[1.1] tracking-[-0.02em]">Every decision,<br />backed by the numbers.</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-[var(--adm-t3)]">Revenue, margin, stock cover, expiry and customer signals in one place, refreshed hourly for the Skinora team.</p>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-[var(--adm-line)] pt-6 text-[11px] text-[var(--adm-t4)]">
            <div><dt>Data</dt><dd className="mt-1 text-sm text-[var(--adm-t1)]">Live · LKR</dd></div>
            <div><dt>Access</dt><dd className="mt-1 text-sm text-[var(--adm-t1)]">Role-based</dd></div>
            <div><dt>Activity</dt><dd className="mt-1 text-sm text-[var(--adm-t1)]">Logged</dd></div>
          </dl>
        </div>
        <p className="flex items-center gap-2 text-xs text-[var(--adm-t4)]"><ShieldCheck width={13} strokeWidth={1.6} /> Staff access only. Sessions expire after 12 hours of inactivity.</p>
      </div>
      <div className="grid place-items-center p-8">
        <div className="w-full max-w-sm">
          <p className="wordmark text-xl lg:hidden">SKINORA</p>
          <h1 className="mt-6 text-[26px] font-medium tracking-[-0.01em]">Staff sign in</h1>
          <p className="mt-1 text-[13px] text-[var(--adm-t3)]">Use your Skinora staff account.</p>
          <StaffLoginForm next={next} />
          <div className="card mt-8 p-4 text-xs text-[var(--adm-t3)]">
            <p className="mb-1.5 font-medium text-[var(--adm-t1)]">Demo accounts (password Skinora@2026)</p>
            <p className="font-mono">admin@skinora.lk <span className="text-[var(--adm-t4)]">· Admin</span></p>
            <p className="font-mono">stock@skinora.lk <span className="text-[var(--adm-t4)]">· Inventory manager</span></p>
            <p className="font-mono">orders@skinora.lk <span className="text-[var(--adm-t4)]">· Order handler</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
