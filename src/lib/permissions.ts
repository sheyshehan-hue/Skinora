import type { StaffRole } from "@prisma/client";

export type Permission = "dashboard" | "products" | "catalog" | "content" | "inventory" | "orders" | "customers" | "analytics" | "promotions" | "staff";

const MATRIX: Record<StaffRole, Permission[]> = {
  ADMIN: ["dashboard", "products", "catalog", "content", "inventory", "orders", "customers", "analytics", "promotions", "staff"],
  INVENTORY_MANAGER: ["dashboard", "products", "catalog", "inventory", "analytics"],
  ORDER_HANDLER: ["dashboard", "orders", "customers"],
};

export const can = (role: StaffRole, p: Permission) => MATRIX[role].includes(p);

export const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: "Admin",
  INVENTORY_MANAGER: "Inventory manager",
  ORDER_HANDLER: "Order handler",
};
