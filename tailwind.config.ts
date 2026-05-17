import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Warm sunset palette — coral + peach are the primary CTA gradient,
          // teal is kept as a quiet secondary for tags / links.
          coral: "#FF6B8B",
          "coral-deep": "#E85478",
          peach: "#FFB380",
          "peach-light": "#FFD0AF",
          sunset: "#FF9A76",
          "sunset-light": "#FFC9B0",
          teal: "#58B2B2",
          "teal-deep": "#47A1A1",
          "teal-light": "#6AD2D2",
          orange: "#F59B55",
          "orange-light": "#F8D3B3",
          sky: "#4A90E2",
        },
        ink: {
          main: "#1A1A1A",
          sub: "#555555",
          mute: "#9AA5B4",
        },
        paper: {
          bg: "#F4F6F9",
          card: "#FFFFFF",
          edge: "#EDEFF3",
          warm: "#FEF3EF",
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(0, 0, 0, 0.08)",
        "soft-sm": "0 6px 16px rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 20px 40px rgba(0, 0, 0, 0.12)",
        "glow-teal": "0 4px 12px rgba(88, 178, 178, 0.35)",
        "glow-teal-lg": "0 0 25px rgba(88, 178, 178, 0.5)",
        "glow-coral": "0 8px 20px rgba(255, 120, 139, 0.35)",
        "glow-coral-lg": "0 12px 28px rgba(255, 120, 139, 0.45)",
        "photo-card": "0 15px 30px rgba(0, 0, 0, 0.15)",
      },
      backgroundImage: {
        "sunset-vertical":
          "linear-gradient(180deg, #EAF2FF 0%, #FEF3EF 100%)",
        "coral-button":
          "linear-gradient(135deg, #FFB380 0%, #FF6B8B 100%)",
      },
      borderRadius: {
        "3xl": "20px",
        "4xl": "28px",
        "5xl": "36px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"PingFang SC"',
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
