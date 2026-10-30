"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loginCustomer, logout } from "@/lib/auth";

type State = { error: string | null };

export async function customerLogin(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") || "/account");
  const c = await prisma.customer.findUnique({ where: { email } });
  if (!c?.passwordHash || !(await bcrypt.compare(password, c.passwordHash))) return { error: "That email and password don't match." };
  await loginCustomer(c.id, c.name);
  redirect(next.startsWith("/") ? next : "/account");
}

const registerSchema = z.object({
  name: z.string().min(2, "Please enter your name."),
  email: z.string().email("Please enter a valid email."),
  phone: z.string().optional(),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

export async function customerRegister(_: State, form: FormData): Promise<State> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;
  const existing = await prisma.customer.findUnique({ where: { email: email.toLowerCase() } });
  if (existing?.passwordHash) return { error: "An account with this email already exists. Please sign in." };
  const passwordHash = await bcrypt.hash(password, 10);
  // Guest customers who register keep their earlier order history
  const c = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data: { name, phone: phone || existing.phone, passwordHash } })
    : await prisma.customer.create({ data: { name, email: email.toLowerCase(), phone, passwordHash, loyaltyPoints: 500, loyalty: { create: { points: 500, reason: "Welcome gift" } } } });
  await loginCustomer(c.id, c.name);
  redirect("/account?welcome=1");
}

export async function customerLogout() {
  await logout("customer");
  redirect("/");
}
