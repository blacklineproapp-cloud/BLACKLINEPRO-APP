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
        // CSS Variables (compatibilidade com código existente)
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Black Line Pro — Design System
        brand: {
          primary: "#6366F1",    // indigo-500
          secondary: "#a855f7",  // purple-500
          accent: "#f59e0b",     // amber-500
          success: "#22c55e",    // green-500
          warning: "#eab308",    // yellow-500
          error: "#ef4444",      // red-500
          info: "#6366f1",       // indigo-500 (consistente com primária)
        },

        // Surface system — Black Line Pro dark palette
        surface: {
          0: "#000000",   // fundo absoluto
          1: "#0a0a0a",   // painéis principais
          2: "#111111",   // cards e containers
          3: "#1a1a1a",   // inputs, hover states
          4: "#222222",   // elementos ativos leves
        },

        // Border system — precisão cirúrgica
        line: {
          subtle: "#1f1f1f",  // bordas quase invisíveis
          default: "#2a2a2a", // bordas padrão
          strong: "#3f3f46",  // zinc-700 para ênfase
          active: "#6366f1",  // borda ativa (indigo)
        },

      },

      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },

      fontSize: {
        // Escala tipográfica Black Line Pro
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },

      letterSpacing: {
        "widest-2": "0.2em",
        "widest-3": "0.3em",
      },

      animation: {
        "fade-in":        "fadeIn 0.2s ease-in-out",
        "slide-up":       "slideUp 0.3s ease-out",
        "slide-down":     "slideDown 0.3s ease-out",
        "zoom-in":        "zoomIn 0.2s ease-out",
        "shimmer":        "shimmer 2s linear infinite",
        "glow-pulse":     "glowPulse 3s ease-in-out infinite",
        "border-flow":    "borderFlow 4s linear infinite",
        "float":          "float 6s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        slideDown: {
          "0%":   { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)",     opacity: "1" },
        },
        zoomIn: {
          "0%":   { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(99, 102, 241, 0.2)" },
          "50%":      { boxShadow: "0 0 28px rgba(99, 102, 241, 0.5)" },
        },
        borderFlow: {
          "0%":   { backgroundPosition: "0% 50%"   },
          "50%":  { backgroundPosition: "100% 50%"  },
          "100%": { backgroundPosition: "0% 50%"   },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)"  },
          "50%":      { transform: "translateY(-8px)" },
        },
      },

      spacing: {
        "18":  "4.5rem",
        "88":  "22rem",
        "100": "25rem",
        "128": "32rem",
      },

      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      boxShadow: {
        // Sombras premium — Black Line Pro
        "glow":         "0 0 20px rgba(99, 102, 241, 0.3)",
        "glow-sm":      "0 0 10px rgba(99, 102, 241, 0.2)",
        "glow-lg":      "0 0 40px rgba(99, 102, 241, 0.4)",
        "glow-xl":      "0 0 60px rgba(99, 102, 241, 0.5)",
        "glow-purple":  "0 0 20px rgba(168, 85, 247, 0.3)",
        "card":         "0 1px 3px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)",
        "card-hover":   "0 4px 16px rgba(0,0,0,0.6), 0 0 1px rgba(99,102,241,0.2)",
        "modal":        "0 25px 50px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)",
        "inset-top":    "inset 0 1px 0 rgba(255,255,255,0.04)",
        "inset-bottom": "inset 0 -1px 0 rgba(255,255,255,0.04)",
      },

      backdropBlur: {
        xs: "2px",
      },

      backgroundImage: {
        // Gradientes Black Line Pro
        "gradient-radial":    "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":     "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "shimmer-light":      "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.06) 50%, transparent 100%)",
        "shimmer-dark":       "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
        "brand-gradient":     "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        "surface-gradient":   "linear-gradient(180deg, #111111 0%, #0a0a0a 100%)",
        "card-shine":         "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
