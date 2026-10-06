import type { Config } from 'tailwindcss';

/*
 * Vercel/Linear-caliber token system. Zinc-based dark palette with a single
 * locked accent (emerald-500). No extra hues leak. Shape: all-soft (12px
 * cards, pill buttons). One font: Geist.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#10b981',
          foreground: '#022c22',
        },
      },
      borderRadius: {
        DEFAULT: '0.75rem',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        elevated: '0 4px 24px -8px rgb(0 0 0 / 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
