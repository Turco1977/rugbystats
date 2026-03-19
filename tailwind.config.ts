import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        nv: {
          DEFAULT: "#0A1628",
          light: "#1E3A5F",
        },
        rd: {
          DEFAULT: "#C8102E",
          light: "#F87171",
          bg: "#FEE2E2",
          border: "#FCA5A5",
        },
        gn: {
          DEFAULT: "#10B981",
          dark: "#059669",
          forest: "#065F46",
          bg: "#D1FAE5",
          border: "#BBF7D0",
          bright: "#34D399",
        },
        yl: {
          DEFAULT: "#F59E0B",
          dark: "#92400E",
          bg: "#FEF3C7",
          border: "#FDE68A",
        },
        bl: {
          DEFAULT: "#3B82F6",
          dark: "#1E40AF",
          bg: "#DBEAFE",
          border: "#93C5FD",
        },
        pr: {
          DEFAULT: "#8B5CF6",
          bg: "#EDE9FE",
        },
        g: {
          1: "#F7F8FA",
          2: "#E8ECF1",
          3: "#CBD2DC",
          4: "#8B95A5",
          5: "#5A6577",
        },
        dk: {
          1: "#0F172A",
          2: "#1E293B",
          3: "#334155",
          4: "#94A3B8",
          5: "#CBD5E1",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "16px",
        pill: "20px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,.05)",
        "card-sm": "0 1px 3px rgba(0,0,0,.1)",
        dropdown: "0 4px 16px rgba(0,0,0,.12)",
        modal: "0 20px 25px rgba(0,0,0,.15)",
        sidebar: "4px 0 20px rgba(0,0,0,.3)",
      },
      backgroundImage: {
        "login-gradient": "linear-gradient(160deg, #0A1628, #C8102E)",
      },
    },
  },
  plugins: [],
};

export default config;
