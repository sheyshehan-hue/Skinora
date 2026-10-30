"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { BarChart3, Boxes, FolderTree, Image as ImageIcon, LayoutDashboard, LogOut, Menu, Package, ShoppingCart, Sparkles, Tag, Upload, Users, UserCog, X, Award, ExternalLink } from "lucide-react";
import type { Permission } from "@/lib/permissions";

const NAV: { href: string; label: string; icon: typeof Package; perm: Permission; group: string }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, perm: "dashboard", group: "" },
  { href: "/admin/insights", label: "Smart insights", icon: Sparkles, perm: "analytics", group: "" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, perm: "analytics", group: "" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, perm: "orders", group: "Sell" },
  { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers", group: "Sell" },
  { href: "/admin/promotions", label: "Promotions", icon: Tag, perm: "promotions", group: "Sell" },
  { href: "/admin/products", label: "Products", icon: Package, perm: "products", group: "Catalogue" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, perm: "catalog", group: "Catalogue" },
  { href: "/admin/brands", label: "Brands", icon: Award, perm: "catalog", group: "Catalogue" },
  { href: "/admin/import", label: "CSV import", icon: Upload, perm: "products", group: "Catalogue" },
  { href: "/admin/content", label: "Home page", icon: ImageIcon, perm: "content", group: "Catalogue" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, perm: "inventory", group: "Operations" },
  { href: "/admin/staff", label: "Staff & roles", icon: UserCog, perm: "staff", group: "Operations" },
];

export function Sidebar({ perms, name, role, logout }: { perms: Permission[]; name: string; role: string; logout: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => perms.includes(n.perm));
  const groups = [...new Set(items.map((i) => i.group))];
  const nav = (
    <nav className="flex h-full flex-col">
      <Link href="/admin" className="px-6 pb-7 pt-7">
        <span className="wordmark block text-xl text-[var(--adm-t1)]">SKINORA</span>
        <span className="mt-1.5 block text-[9.5px] uppercase tracking-[0.22em] text-[var(--adm-gold)]">Operations workspace</span>
      </Link>
      <div className="flex-1 space-y-6 overflow-y-auto px-3">
        {groups.map((g) => (
          <div key={g}>
            {g && <p className="mb-1.5 px-3 text-[9.5px] font-medium uppercase tracking-[0.18em] text-[var(--adm-t4)]">{g}</p>}
            <ul className="space-y-px">
              {items.filter((i) => i.group === g).map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
                return (
                  <li key={href}>
                    <Link href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={clsx("relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition", active ? "bg-white/[0.06] text-[var(--adm-t1)]" : "text-[var(--adm-t3)] hover:bg-white/[0.04] hover:text-[var(--adm-t1)]")}>
                      {active && <span className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--adm-gold)]" />}
                      <Icon width={16} strokeWidth={1.6} className={active ? "text-[var(--adm-gold)]" : ""} /> {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--adm-line)] p-4">
        <p className="text-[13px] font-medium text-[var(--adm-t1)]">{name}</p>
        <p className="text-[11px] text-[var(--adm-t4)]">{role}</p>
        <div className="mt-3 flex gap-2">
          <Link href="/" target="_blank" className="a-btn-secondary h-8 flex-1 text-xs"><ExternalLink width={12} strokeWidth={1.6} /> View store</Link>
          <form action={logout}><button className="a-btn-secondary h-8 px-3" aria-label="Sign out"><LogOut width={14} /></button></form>
        </div>
      </div>
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--adm-line)] bg-[var(--adm-bg)] px-4 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Menu" className="-ml-2 grid h-11 w-11 place-items-center"><Menu width={20} /></button>
        <span className="wordmark text-lg">SKINORA</span>
        <span className="w-5" />
      </div>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--adm-line)] bg-[#0E1119] lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-[#0E1119]">
            <button className="absolute right-3 top-6" onClick={() => setOpen(false)} aria-label="Close"><X width={18} /></button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
