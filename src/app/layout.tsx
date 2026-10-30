import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const display = Bodoni_Moda({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-display", display: "swap" });
const sans = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans", display: "swap" });

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Skinora | Authentic Luxury Skincare & Fragrance in Sri Lanka", template: "%s | Skinora" },
  description:
    "100% authentic international skincare and fragrance in Sri Lanka. Medicube, The Ordinary, CeraVe, YSL, Dior and more, with batch and expiry details on every product. Same-day delivery in Colombo.",
  openGraph: { type: "website", siteName: "Skinora", locale: "en_LK" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#F4EFE8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
