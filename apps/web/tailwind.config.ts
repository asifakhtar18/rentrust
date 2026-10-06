import type { Config } from 'tailwindcss';

/**
 * Apple-inspired design system tokens. Colors, radii, shadows, and motion are
 * driven by CSS custom properties (see globals.css) so light/dark are a single
 * source of truth. The scale follows an 8pt rhythm and a restrained type ramp.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Surfaces (materials): base canvas → raised → overlay.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        hairline: 'rgb(var(--hairline) / <alpha-value>)',
        // Text roles.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-secondary': 'rgb(var(--ink-secondary) / <alpha-value>)',
        'ink-tertiary': 'rgb(var(--ink-tertiary) / <alpha-value>)',
        // Single confident accent (iOS system blue) + semantic hues.
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        positive: 'rgb(var(--positive) / <alpha-value>)',
        caution: 'rgb(var(--caution) / <alpha-value>)',
        critical: 'rgb(var(--critical) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'Inter',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        // Apple-leaning ramp with tight display tracking.
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0' }],
        footnote: ['0.8125rem', { lineHeight: '1.125rem' }],
        body: ['0.9375rem', { lineHeight: '1.5rem' }],
        callout: ['1.0625rem', { lineHeight: '1.6rem' }],
        title3: ['1.25rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        title2: ['1.5rem', { lineHeight: '1.85rem', letterSpacing: '-0.018em' }],
        title1: ['2rem', { lineHeight: '2.3rem', letterSpacing: '-0.022em' }],
        display: ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.028em' }],
        'display-lg': ['3.75rem', { lineHeight: '3.9rem', letterSpacing: '-0.032em' }],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        // Layered soft depth (offset + blur), never a flat halo.
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -8px rgb(var(--shadow) / 0.12)',
        raised: '0 2px 4px rgb(var(--shadow) / 0.08), 0 18px 48px -12px rgb(var(--shadow) / 0.22)',
        focus: '0 0 0 4px rgb(var(--accent) / 0.28)',
      },
      transitionTimingFunction: {
        // Exponential ease-out — the Apple "settle".
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
