/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-clash)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fc',
          400: '#36aaf8',
          500: '#0c8fe9',
          600: '#0070c7',
          700: '#0059a2',
          800: '#044c85',
          900: '#09406e',
          950: '#062849',
        },
        surface: {
          DEFAULT: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          900: '#0f172a',
          950: '#080f1d',
        },
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px -1px rgb(15 23 42 / 0.03)',
        'card-hover': '0 8px 24px -6px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
        'btn': '0 1px 2px 0 rgb(15 23 42 / 0.08), inset 0 1px 0 0 rgb(255 255 255 / 0.08)',
        'ring-brand': '0 0 0 4px rgb(12 143 233 / 0.18)',
      },
      borderRadius: {
        'xl': '0.85rem',
        '2xl': '1.1rem',
      },
    },
  },
  plugins: [],
}
