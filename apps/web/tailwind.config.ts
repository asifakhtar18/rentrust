import type { Config } from 'tailwindcss';

/**
 * RentTrust design tokens — DARK-FIRST. Apple-quality craft (smooth motion,
 * generous spacing, pill shapes, layered depth, clean type) with RentTrust's
 * own identity: a deep warm-charcoal world lit by a warm amber accent.
 * No blue, no green. Colors resolve from CSS custom properties (globals.css);
 * the default is dark, light is opt-in via [data-theme="light"].
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="light"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        hairline: 'rgb(var(--hairline) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-secondary': 'rgb(var(--ink-secondary) / <alpha-value>)',
        'ink-tertiary': 'rgb(var(--ink-tertiary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        positive: 'rgb(var(--positive) / <alpha-value>)',
        caution: 'rgb(var(--caution) / <alpha-value>)',
        critical: 'rgb(var(--critical) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0' }],
        footnote: ['0.8125rem', { lineHeight: '1.125rem' }],
        body: ['0.9375rem', { lineHeight: '1.5rem' }],
        callout: ['1.0625rem', { lineHeight: '1.6rem' }],
        title3: ['1.25rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        title2: ['1.5rem', { lineHeight: '1.85rem', letterSpacing: '-0.016em' }],
        title1: ['1.875rem', { lineHeight: '2.2rem', letterSpacing: '-0.02em' }],
        display: ['2.5rem', { lineHeight: '2.8rem', letterSpacing: '-0.025em' }],
        'display-lg': ['3.25rem', { lineHeight: '3.5rem', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        /* Deep, soft shadows for a dark world — depth comes from the glow of
           raised surfaces more than drop shadow. */
        card: '0 1px 3px rgb(var(--shadow) / 0.4), 0 6px 20px -8px rgb(var(--shadow) / 0.5)',
        raised: '0 4px 10px rgb(var(--shadow) / 0.45), 0 16px 40px -10px rgb(var(--shadow) / 0.6)',
        focus: '0 0 0 3px rgb(var(--accent) / 0.4)',
        glow: '0 0 24px -4px rgb(var(--accent) / 0.35)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
