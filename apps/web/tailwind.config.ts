import type { Config } from 'tailwindcss';

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
        violet: 'rgb(var(--violet) / <alpha-value>)',
        coral: 'rgb(var(--coral) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        positive: 'rgb(var(--positive) / <alpha-value>)',
        caution: 'rgb(var(--caution) / <alpha-value>)',
        critical: 'rgb(var(--critical) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem' }],
        footnote: ['0.8125rem', { lineHeight: '1.125rem' }],
        body: ['0.9375rem', { lineHeight: '1.5rem' }],
        callout: ['1.0625rem', { lineHeight: '1.6rem' }],
        title3: ['1.25rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        title2: ['1.5rem', { lineHeight: '1.85rem', letterSpacing: '-0.016em' }],
        title1: ['2rem', { lineHeight: '2.3rem', letterSpacing: '-0.02em' }],
        display: ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.03em' }],
        'display-lg': ['3.75rem', { lineHeight: '3.9rem', letterSpacing: '-0.035em' }],
        hero: ['5rem', { lineHeight: '5rem', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgb(var(--shadow) / 0.5), 0 8px 24px -8px rgb(var(--shadow) / 0.6)',
        raised: '0 4px 10px rgb(var(--shadow) / 0.5), 0 20px 50px -12px rgb(var(--shadow) / 0.7)',
        glow: '0 0 28px -6px rgb(var(--accent) / 0.4)',
        'glow-violet': '0 0 28px -6px rgb(var(--violet) / 0.35)',
        'glow-coral': '0 0 28px -6px rgb(var(--coral) / 0.35)',
        focus: '0 0 0 3px rgb(var(--accent) / 0.5)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
