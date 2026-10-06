import type { Config } from 'tailwindcss';

/*
 * RentTrust — Folyo-grade token mapping. All colors resolve from HSL CSS
 * variables (globals.css) so themes are authored, not inverted. One functional
 * accent (primary indigo). Inter for UI, Geist Mono for tabular data.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'Helvetica Neue',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          hover: 'hsl(var(--primary-hover) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        success: 'hsl(var(--success) / <alpha-value>)',
        positive: 'hsl(var(--positive) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--radius-control)',
        DEFAULT: 'var(--radius-input)',
        md: 'var(--radius-input)',
        lg: 'var(--radius)',
        xl: 'var(--radius-xl)',
        pill: '9999px',
      },
      boxShadow: {
        /* Apple-style soft, diffuse elevation — never harsh. */
        sm: '0 1px 2px 0 hsl(240 6% 10% / 0.05)',
        DEFAULT: '0 2px 8px -2px hsl(240 6% 10% / 0.08)',
        md: '0 8px 30px -8px hsl(240 6% 10% / 0.14)',
        lg: '0 20px 60px -16px hsl(240 6% 10% / 0.22)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
