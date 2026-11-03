import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonts load from Google Fonts in the browser. next/font/google downloaded them during the build,
// and the build failed whenever that download failed. --font-serif, --font-display and --font-sans
// are set in globals.css.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Jost:wght@300;400;500&display=swap";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
