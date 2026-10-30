import { requireStaff } from "@/lib/auth";
import { can, ROLE_LABEL, type Permission } from "@/lib/permissions";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { staffLogout } from "@/actions/staff-auth";

export const metadata = { title: { default: "Admin", template: "%s · Skinora Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

const ALL: Permission[] = ["dashboard", "products", "catalog", "content", "inventory", "orders", "customers", "analytics", "promotions", "staff"];

/** The operations workspace: a dark, banking-grade shell so the team reads numbers, not decoration. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="adm min-h-screen">
      <Sidebar perms={ALL.filter((p) => can(staff.role, p))} name={staff.name} role={ROLE_LABEL[staff.role]} logout={staffLogout} />
      <div className="lg:pl-64">
        <Topbar name={staff.name} role={ROLE_LABEL[staff.role]} />
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
