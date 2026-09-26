const { themeColors, themePlugin } = require('./theme.tokens')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: themeColors,
      boxShadow: {
        'card': '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px -1px rgb(15 23 42 / 0.04)',
        'card-hover': '0 12px 32px -12px rgb(15 23 42 / 0.14), 0 4px 10px -4px rgb(15 23 42 / 0.06)',
        'elevated': '0 24px 60px -18px rgb(15 23 42 / 0.25), 0 8px 20px -8px rgb(15 23 42 / 0.10)',
        'btn': '0 1px 2px 0 rgb(15 23 42 / 0.10), inset 0 1px 0 0 rgb(255 255 255 / 0.14)',
        'btn-brand': '0 1px 2px 0 rgb(0 89 162 / 0.30), 0 4px 14px -4px rgb(12 143 233 / 0.45), inset 0 1px 0 0 rgb(255 255 255 / 0.18)',
        'ring-brand': '0 0 0 4px rgb(12 143 233 / 0.18)',
        'glow': '0 0 0 1px rgb(12 143 233 / 0.12), 0 20px 60px -20px rgb(12 143 233 / 0.45)',
      },
      borderRadius: {
        'xl': '0.85rem',
        '2xl': '1.1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out both',
        'fade-up': 'fade-up 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-left': 'slide-in-left 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [themePlugin],
}
