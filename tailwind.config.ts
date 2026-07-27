import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Noto Sans Thai", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        dark: {
          50: "#f8f8ff",
          100: "#e8e8f0",
          200: "#c8c8d8",
          300: "#9898b0",
          400: "#686880",
          500: "#404060",
          600: "#282840",
          700: "#181828",
          800: "#101018",
          900: "#0a0a0f",
          950: "#050508",
        },
        surface: {
          DEFAULT: "rgba(255,255,255,0.06)",
          hover: "rgba(255,255,255,0.10)",
          border: "rgba(255,255,255,0.12)",
        },
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
        "gradient-success": "linear-gradient(135deg, #059669 0%, #10b981 100%)",
        "gradient-danger": "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
        "gradient-warning": "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
        "gradient-dark": "linear-gradient(180deg, #0a0a0f 0%, #101018 100%)",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "slide-up": "slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-down": "slideDown 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fadeIn 0.2s ease-out",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-primary": "0 0 30px rgba(124, 58, 237, 0.3)",
        "glow-success": "0 0 30px rgba(16, 185, 129, 0.3)",
        "glow-danger": "0 0 30px rgba(239, 68, 68, 0.3)",
        "glass": "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
        "nav": "0 -1px 0 rgba(255,255,255,0.06), 0 -8px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
