import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nature Calm theme colors
        green: {
          50: "#F6FBF6",
          200: "#DFF6E6",
          500: "#57B36A",
          600: "#439153",
        },
        sage: "#7EA67F",
        muted: "#6B7280",
        white: "#FFFFFF",
        glass: "rgba(255, 255, 255, 0.65)",
      },
      boxShadow: {
        soft: "0 6px 20px rgba(34, 50, 30, 0.08)",
      },
      borderRadius: {
        card: "14px",
        pill: "999px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-calm": "linear-gradient(180deg, var(--green-50) 0%, var(--white) 80%)",
      },
      animation: {
        press: "press 160ms ease",
      },
      keyframes: {
        press: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.98)" },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
