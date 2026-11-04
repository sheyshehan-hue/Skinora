import { ImageResponse } from "next/og";

export const alt = "Skinora: authentic luxury skincare and fragrance in Sri Lanka";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F4EFE8", color: "#1C1A17", fontFamily: "serif" }}>
        <div style={{ fontSize: 112, letterSpacing: 36, fontWeight: 300 }}>SKINORA</div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#5B544B" }}>Authentic skincare, fragrance and lifestyle for men and women</div>
        <div style={{ marginTop: 18, fontSize: 26, color: "#8A7B62", letterSpacing: 4, textTransform: "uppercase" }}>Sri Lanka · Prices in LKR · Same-day Colombo delivery</div>
      </div>
    ),
    size,
  );
}
