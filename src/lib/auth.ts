import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { prisma } from "./prisma";
import { can, type Permission } from "./permissions";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me");
export const STAFF_COOKIE = "sk_staff";
export const CUSTOMER_COOKIE = "sk_customer";

type StaffToken = { sub: string; role: StaffRole; name: string; kind: "staff" };
type CustomerToken = { sub: string; name: string; kind: "customer" };

export async function signToken(payload: StaffToken | CustomerToken, days = 7) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(secret());
}

export async function verifyToken<T>(token?: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

async function setCookie(name: string, token: string, days: number) {
  (await cookies()).set(name, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: days * 86400 });
}

export async function loginStaff(id: string, role: StaffRole, name: string) {
  await setCookie(STAFF_COOKIE, await signToken({ sub: id, role, name, kind: "staff" }, 1), 1);
}
export async function loginCustomer(id: string, name: string) {
  await setCookie(CUSTOMER_COOKIE, await signToken({ sub: id, name, kind: "customer" }, 30), 30);
}
export async function logout(kind: "staff" | "customer") {
  (await cookies()).delete(kind === "staff" ? STAFF_COOKIE : CUSTOMER_COOKIE);
}

export async function getStaff() {
  const t = await verifyToken<StaffToken>((await cookies()).get(STAFF_COOKIE)?.value);
  if (!t || t.kind !== "staff") return null;
  return { id: t.sub, role: t.role, name: t.name };
}

/** Use at the top of every admin page and server action. */
export async function requireStaff(permission?: Permission) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (permission && !can(staff.role, permission)) redirect("/admin?denied=1");
  return staff;
}

export async function getCustomerSession() {
  const t = await verifyToken<CustomerToken>((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!t || t.kind !== "customer") return null;
  return { id: t.sub, name: t.name };
}

export async function getCustomer() {
  const s = await getCustomerSession();
  if (!s) return null;
  return prisma.customer.findUnique({ where: { id: s.id } });
}
