"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loginStaff, logout } from "@/lib/auth";

export async function staffLogin(_: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const u = await prisma.staffUser.findUnique({ where: { email } });
  if (!u || !u.active || !(await bcrypt.compare(password, u.passwordHash))) return { error: "Invalid email or password." };
  await prisma.staffUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
  await loginStaff(u.id, u.role, u.name);
  const next = String(form.get("next") || "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function staffLogout() {
  await logout("staff");
  redirect("/admin/login");
}
