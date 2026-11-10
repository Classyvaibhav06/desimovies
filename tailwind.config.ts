import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#e50914",
          hi: "#ff4651",
        },
        ink: {
          950: "#0f0f0f",
          900: "#181818",
          850: "#212121",
          800: "#2a2a2a",
          700: "#353535",
          400: "#6f6f6f",
          300: "#b3b3b3",
          100: "#f2f2f2",
        },
        ink2: "#06121c",
        reef: "#0f2f47",
        saffron: "#f3b54a",
        coral: "#ff8448"
      },
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "Impact", "sans-serif"],
      },
      boxShadow: {
        glow: "0 20px 60px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
