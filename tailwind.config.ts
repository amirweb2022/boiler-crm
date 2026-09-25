import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { vazir: ["var(--font-vazirmatn)", "Tahoma", "sans-serif"] },
      colors: {
        brand: { 50: "#eff6ff", 500: "#2563eb", 600: "#1d4ed8", 700: "#1e40af" },
        status: { pending: "#f59e0b", done: "#16a34a", overdue: "#dc2626", near_due: "#f97316" },
      },
    },
  },
  plugins: [require("tailwindcss-rtl")],
} satisfies Config;
