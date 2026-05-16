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
          teal: "#58B2B2",
          "teal-deep": "#47A1A1",
          "teal-light": "#6AD2D2",
          orange: "#F59B55",
          "orange-light": "#F8D3B3",
        },
        ink: {
          main: "#242A38",
          sub: "#6E7C8C",
          mute: "#9AA5B4",
        },
        paper: {
          bg: "#F2F5F8",
          card: "#FFFFFF",
          edge: "#E5EAF0",
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(0, 0, 0, 0.08)",
        "soft-sm": "0 6px 16px rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 20px 40px rgba(0, 0, 0, 0.12)",
        "glow-teal": "0 4px 12px rgba(88, 178, 178, 0.35)",
        "glow-teal-lg": "0 0 25px rgba(88, 178, 178, 0.5)",
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
