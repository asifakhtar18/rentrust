import type { Config } from 'tailwindcss';

/*
 * RentTrust design tokens — LIGHT-FIRST, warm, editorial, premium.
 * Following the RentTrust UI Skill spec exactly.
 *
 * Background: #FAFAF9 (warm white)
 * Surface: #FFFFFF
 * Brand: #4F46E5 (deep indigo)
 * Typography: Geist Sans, clean weights
 * Radius: restrained (6/8/12/16)
 * Shadows: minimal, borders preferred
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: '#FAFAF9',
        surface: '#FFFFFF',
        'surface-hover': '#F5F5F4',
        'surface-active': '#EEEEEC',
        foreground: '#171717',
        'text-secondary': '#666666',
        'text-tertiary': '#999999',
        border: '#E7E5E4',
        'border-subtle': '#F0EEEC',
        brand: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          muted: '#EEF2FF',
          foreground: '#FFFFFF',
        },
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        md: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '600' }],
        'h1': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '600' }],
        'h2': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'small': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.8125rem', { lineHeight: '1.4' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
