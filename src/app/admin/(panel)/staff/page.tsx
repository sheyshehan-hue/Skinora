import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { saveStaff } from "@/actions/admin/catalog";
import { ROLE_LABEL } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { Badge, Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Staff & roles" };

const ACCESS = [
  ["Admin", "Everything, including staff, promotions, content and analytics."],
  ["Inventory manager", "Products, categories, brands, CSV import, inventory, batches and analytics."],
  ["Order handler", "Orders, returns, COD tracking and customers."],
];

export default async function StaffPage() {
  await requireStaff("staff");
  const staff = await prisma.staffUser.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageTitle title="Staff & roles" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card pad={false} className="xl:col-span-2">
          {staff.map((u) => (
            <details key={u.id} className="border-b border-ink/[0.06] last:border-0">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3 hover:bg-ivory-50">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs text-white">{u.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                <span className="flex-1"><span className="block font-medium">{u.name}</span><span className="text-xs text-ink-400">{u.email}</span></span>
                <Badge tone={u.role === "ADMIN" ? "info" : "neutral"}>{ROLE_LABEL[u.role]}</Badge>
                {!u.active && <Badge tone="critical">Disabled</Badge>}
                <span className="hidden w-32 text-right text-xs text-ink-400 sm:block">{u.lastLoginAt ? `Last in ${formatDate(u.lastLoginAt, { day: "numeric", month: "short" })}` : "Never signed in"}</span>
              </summary>
              <div className="bg-ivory-50 px-5 py-4"><StaffForm u={u} /></div>
            </details>
          ))}
        </Card>
        <div className="space-y-6">
          <Card title="Invite staff"><StaffForm /></Card>
          <Card title="What each role can do">
            <dl className="space-y-3 text-sm">{ACCESS.map(([r, d]) => <div key={r}><dt className="font-medium">{r}</dt><dd className="text-xs text-ink-500">{d}</dd></div>)}</dl>
          </Card>
        </div>
      </div>
    </>
  );
}

function StaffForm({ u }: { u?: { id: string; name: string; email: string; role: string; active: boolean } }) {
  return (
    <form action={saveStaff} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={u?.id ?? ""} />
      <label><span className="a-label">Name</span><input name="name" defaultValue={u?.name} required className="a-input" /></label>
      <label><span className="a-label">Email</span><input name="email" type="email" defaultValue={u?.email} required className="a-input" /></label>
      <label><span className="a-label">Role</span><select name="role" defaultValue={u?.role ?? "ORDER_HANDLER"} className="a-input"><option value="ADMIN">Admin</option><option value="INVENTORY_MANAGER">Inventory manager</option><option value="ORDER_HANDLER">Order handler</option></select></label>
      <label><span className="a-label">{u ? "New password (optional)" : "Password"}</span><input name="password" type="password" minLength={u ? 0 : 8} className="a-input" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={u?.active ?? true} className="accent-ink" /> Active</label>
      <button className="a-btn-primary sm:justify-self-end">{u ? "Save" : "Add staff member"}</button>
    </form>
  );
}
