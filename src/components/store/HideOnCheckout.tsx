"use client";
import { usePathname } from "next/navigation";

// Checkout is kept free of browsing links so nothing pulls the customer away before paying.
export function HideOnCheckout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return path?.startsWith("/checkout") ? null : <>{children}</>;
}
