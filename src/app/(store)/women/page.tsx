import type { Metadata } from "next";
import { LandingPage } from "@/components/store/LandingPage";
import { LANDINGS } from "@/lib/landing";
import { alternates } from "@/lib/seo";

export const revalidate = 3600;
const landing = LANDINGS.women;

export const metadata: Metadata = {
  title: { absolute: landing.metaTitle },
  description: landing.metaDescription,
  alternates: alternates("/women"),
  openGraph: { title: landing.metaTitle, description: landing.metaDescription, url: "/women" },
};

export default function Page() {
  return <LandingPage landing={landing} />;
}
