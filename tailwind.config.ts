import type { Config } from "tailwindcss";

export default {
  content: ["src/**/*.{html,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cc: {
          base: "#0B0F19",
          surface: "#111827",
          elevated: "#1F2937",
          overlay: "#374151",
          green: "#22C55E",
          "green-hover": "#16A34A",
          blue: "#3B82F6",
          amber: "#F59E0B",
          red: "#EF4444",
          whatsapp: "#25D366",
          telegram: "#26A5E4",
          gmail: "#EA4335",
          linkedin: "#0A66C2",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderColor: {
        subtle: "#1F2937",
        default: "#374151",
      },
    },
  },
  plugins: [],
} satisfies Config;
