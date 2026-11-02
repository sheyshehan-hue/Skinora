import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}", "./public/face-scan/**/*.js"],
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: "#F6F2EC", 50: "#FBF9F5", 100: "#F6F2EC", 200: "#EDE7DE", 300: "#E2D9CC" },
        stone: { DEFAULT: "#EFE9E1", 100: "#F3EEE7", 200: "#E8E1D6", 400: "#B9AE9E", 600: "#8C8172" },
        ink: { DEFAULT: "#1A1917", 700: "#2E2C29", 500: "#5E5A55", 400: "#8A857E", 300: "#B5AFA6" },
        champagne: { DEFAULT: "#C6A15B", 50: "#FBF7EE", 100: "#F3EAD6", 200: "#E8D7B3", 300: "#D9BE88", 400: "#C6A15B", 600: "#9C7A3C", 700: "#7A5E2C" },
        sage: "#7D8B74",
        rosewood: "#9A5B5B",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        display: ["var(--font-display)", "Didot", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { luxe: "0.22em" },
      transitionTimingFunction: { luxe: "cubic-bezier(0.22, 1, 0.36, 1)" },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "none" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        scan: { "0%": { top: "-33%" }, "100%": { top: "100%" } },
        heroIn: { "0%": { opacity: "0", transform: "scale(1.04)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: {
        fadeUp: "fadeUp 900ms cubic-bezier(0.22,1,0.36,1) both",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
