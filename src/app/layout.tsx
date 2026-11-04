import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import { LK_KEYWORDS, SITE, STORE, ldJson, siteGraph } from "@/lib/seo";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const display = Bodoni_Moda({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-display", display: "swap" });
const sans = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Skinora | Authentic Skincare, Perfume & Lifestyle in Sri Lanka", template: "%s | Skinora Sri Lanka" },
  description:
    "Shop 100% authentic skincare, perfume and lifestyle for men and women in Sri Lanka. CeraVe, The Ordinary, Medicube, Dior, Chanel and more in LKR, with batch and expiry shown. Same-day Colombo delivery, cash on delivery island-wide.",
  applicationName: STORE.name,
  keywords: LK_KEYWORDS,
  openGraph: { type: "website", siteName: STORE.name, locale: "en_LK", url: SITE },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  other: { "geo.region": "LK-11", "geo.placename": "Colombo", "geo.position": `${STORE.geo.lat};${STORE.geo.lng}`, ICBM: `${STORE.geo.lat}, ${STORE.geo.lng}` },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = { themeColor: "#F4EFE8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-LK" className={`${serif.variable} ${display.variable} ${sans.variable}`}>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Skinora for AI assistants" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(siteGraph())} />
        {children}
      </body>
    </html>
  );
}
