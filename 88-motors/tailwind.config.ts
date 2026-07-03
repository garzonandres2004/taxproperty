import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#dc2626",
          dark: "#991b1b",
          light: "#fca5a5",
        },
        ink: "#0a0a0a",
      },
    },
  },
  plugins: [],
};

export default config;
