"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { BannerPlacement, StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { storeImage } from "@/lib/upload";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const file = (f: FormData, k: string) => {
  const v = f.get(k);
  return v instanceof File && v.size > 0 ? v : null;
};
const refresh = () => revalidatePath("/", "layout");

// ───────── categories
export async function saveCategory(form: FormData) {
  await requireStaff("catalog");
  const id = s(form, "id");
  const img = file(form, "image");
  const data = {
    name: s(form, "name"),
    slug: slugify(s(form, "slug") || s(form, "name")),
    description: s(form, "description") || null,
    parentId: s(form, "parentId") || null,
    sortOrder: Number(s(form, "sortOrder") || 0),
    ...(img ? { imageUrl: (await storeImage(img, "categories")).url } : {}),
  };
  if (!data.name) return;
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/admin/categories");
  refresh();
}

export async function deleteCategory(form: FormData) {
  await requireStaff("catalog");
  const id = s(form, "id");
  const used = await prisma.product.count({ where: { categoryId: id } });
  if (used) throw new Error("Move this category's products first.");
  await prisma.category.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  refresh();
}

// ───────── brands
export async function saveBrand(form: FormData) {
  await requireStaff("catalog");
  const id = s(form, "id");
  const logo = file(form, "logo");
  const data = {
    name: s(form, "name"),
    slug: slugify(s(form, "slug") || s(form, "name")),
    origin: s(form, "origin") || null,
    description: s(form, "description") || null,
    featured: form.get("featured") === "on",
    isLuxury: form.get("isLuxury") === "on",
    ...(logo ? { logoUrl: (await storeImage(logo, "brands")).url } : {}),
  };
  if (!data.name) return;
  if (id) await prisma.brand.update({ where: { id }, data });
  else await prisma.brand.create({ data });
  revalidatePath("/admin/brands");
  refresh();
}

export async function deleteBrand(form: FormData) {
  await requireStaff("catalog");
  const id = s(form, "id");
  if (await prisma.product.count({ where: { brandId: id } })) throw new Error("This brand still has products.");
  await prisma.brand.delete({ where: { id } });
  revalidatePath("/admin/brands");
}

// ───────── banners
export async function saveBanner(form: FormData) {
  await requireStaff("content");
  const id = s(form, "id");
  const img = file(form, "image");
  const data = {
    placement: (s(form, "placement") || "HERO") as BannerPlacement,
    eyebrow: s(form, "eyebrow") || null,
    title: s(form, "title"),
    subtitle: s(form, "subtitle") || null,
    ctaLabel: s(form, "ctaLabel") || null,
    ctaHref: s(form, "ctaHref") || null,
    sortOrder: Number(s(form, "sortOrder") || 0),
    active: form.get("active") === "on",
    ...(img ? { imageUrl: (await storeImage(img, "banners")).url } : {}),
  };
  if (!data.title) return;
  if (id) await prisma.banner.update({ where: { id }, data });
  else await prisma.banner.create({ data });
  revalidatePath("/admin/content");
  refresh();
}

export async function deleteBanner(form: FormData) {
  await requireStaff("content");
  await prisma.banner.delete({ where: { id: s(form, "id") } });
  revalidatePath("/admin/content");
  refresh();
}

// ───────── collections
export async function saveCollection(form: FormData) {
  await requireStaff("content");
  const id = s(form, "id");
  const img = file(form, "image");
  const productIds = form.getAll("productIds").map(String).filter(Boolean);
  const data = {
    title: s(form, "title"),
    slug: slugify(s(form, "slug") || s(form, "title")),
    eyebrow: s(form, "eyebrow") || null,
    description: s(form, "description") || null,
    featured: form.get("featured") === "on",
    ...(img ? { imageUrl: (await storeImage(img, "collections")).url } : {}),
  };
  if (!data.title) return;
  const c = id ? await prisma.collection.update({ where: { id }, data }) : await prisma.collection.create({ data });
  await prisma.collectionProduct.deleteMany({ where: { collectionId: c.id } });
  await prisma.collectionProduct.createMany({ data: productIds.map((productId, i) => ({ collectionId: c.id, productId, sortOrder: i })) });
  revalidatePath("/admin/content");
  refresh();
}

export async function deleteCollection(form: FormData) {
  await requireStaff("content");
  await prisma.collection.delete({ where: { id: s(form, "id") } });
  revalidatePath("/admin/content");
  refresh();
}

// ───────── staff
export async function saveStaff(form: FormData) {
  const me = await requireStaff("staff");
  const id = s(form, "id");
  const password = s(form, "password");
  const data = { name: s(form, "name"), email: s(form, "email").toLowerCase(), role: s(form, "role") as StaffRole, active: form.get("active") === "on" };
  if (id === me.id && (data.role !== "ADMIN" || !data.active)) throw new Error("You can't remove your own admin access.");
  if (id) await prisma.staffUser.update({ where: { id }, data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) } });
  else {
    if (password.length < 8) throw new Error("Set a password of at least 8 characters.");
    await prisma.staffUser.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  }
  revalidatePath("/admin/staff");
}
