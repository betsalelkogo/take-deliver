import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: "#2b1240",
        mag: {
          DEFAULT: "#d42a8c",
          dark: "#c11f7e",
          brand: "#e5399b",
        },
        cream: "#fdfbf7",
        line: "#e7deec",
        muted: "#f4eff7",
        soft: "#6b5c77",
        brand: {
          50: "#fde8f4",
          100: "#fbc4e4",
          200: "#f59ccc",
          300: "#ee6bb3",
          400: "#e5399b",
          500: "#d42a8c",
          600: "#d42a8c",
          700: "#c11f7e",
          800: "#8d1858",
          900: "#2b1240",
        },
        slate: {
          50: "#fdfbf7",
          100: "#f4eff7",
          200: "#e7deec",
          300: "#d4c6de",
          400: "#8d7c99",
          500: "#6b5c77",
          600: "#5c4d68",
          700: "#4a3c56",
          800: "#3a2c46",
          900: "#2b1240",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "Assistant", "system-ui", "sans-serif"],
        head: ["var(--font-head)", "Rubik", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hard: "4px 4px 0 #2b1240",
        "hard-sm": "3px 3px 0 #2b1240",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
