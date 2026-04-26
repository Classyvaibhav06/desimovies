import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#06121c",
        reef: "#0f2f47",
        saffron: "#f3b54a",
        coral: "#ff8448"
      },
      boxShadow: {
        glow: "0 20px 60px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
