// Theme tokens for light & dark mode.
//
// Every themable color is a CSS variable holding "r g b" channels, so Tailwind's opacity
// modifiers keep working (bg-slate-100/50). Light values are the normal Tailwind palette;
// dark values are defined here. Components use ordinary classes (bg-card, text-slate-900,
// bg-emerald-50…) and switch automatically when <html class="dark"> is set.
//
//  • slate  — neutrals, re-mapped for dark surfaces (text becomes light, borders darker)
//  • card   — elevated surfaces (was bg-white)
//  • surface— app background shades
//  • accents— 50–200 become dark tints, 700–950 become light text shades; 300–600 unchanged
//  • ink    — fixed dark palette for always-dark UI (sidebar, dark sections, overlays, tooltips)

const colors = require('tailwindcss/colors')

const brand = {
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
}

const CARD_DARK = '#0f1729'

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const channels = (hex) => hexToRgb(hex).join(' ')
const mix = (a, b, weight) => {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return [r1 * weight + r2 * (1 - weight), g1 * weight + g2 * (1 - weight), b1 * weight + b2 * (1 - weight)]
    .map((v) => Math.round(v))
    .join(' ')
}

// Neutral scale for dark mode (index = shade). Tuned for readable text on #0f1729 cards.
const SLATE_DARK = {
  50: '#162033',
  100: '#1b263b',
  200: '#26324a',
  300: '#334155',
  400: '#7d8ba1',
  500: '#94a3b8',
  600: '#a9b5c7',
  700: '#cbd5e1',
  800: '#e2e8f0',
  900: '#f1f5f9',
  950: '#f8fafc',
}

const ACCENTS = {
  brand,
  emerald: colors.emerald,
  amber: colors.amber,
  red: colors.red,
  blue: colors.blue,
  purple: colors.purple,
  violet: colors.violet,
  indigo: colors.indigo,
  sky: colors.sky,
  rose: colors.rose,
  orange: colors.orange,
  teal: colors.teal,
  pink: colors.pink,
  green: colors.green,
}

function accentDark(palette, shade) {
  const base = palette[500]
  switch (shade) {
    case '50':
      return mix(base, CARD_DARK, 0.14)
    case '100':
      return mix(base, CARD_DARK, 0.22)
    case '200':
      return mix(base, CARD_DARK, 0.34)
    // 300 stays as-is: it is used as light text / gradients on always-dark areas and as hover borders.
    case '700':
      return channels(palette[300])
    case '800':
      return channels(palette[200])
    case '900':
      return channels(palette[100])
    case '950':
      return channels(palette[50])
    default:
      return channels(palette[shade])
  }
}

const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

function paletteFromVars(name) {
  return Object.fromEntries(SHADES.map((s) => [s, v(`${name}-${s}`)]))
}

const light = {}
const dark = {}

for (const s of SHADES) {
  light[`--c-slate-${s}`] = channels(colors.slate[s])
  dark[`--c-slate-${s}`] = channels(SLATE_DARK[s])
}
for (const [name, palette] of Object.entries(ACCENTS)) {
  for (const s of SHADES) {
    light[`--c-${name}-${s}`] = channels(palette[s])
    dark[`--c-${name}-${s}`] = accentDark(palette, s)
  }
}
Object.assign(light, {
  '--c-card': channels('#ffffff'),
  '--c-surface-50': channels('#f7f8fb'),
  '--c-surface-100': channels('#f1f4f8'),
  '--c-surface-200': channels('#e3e8ef'),
  '--c-chart-1': channels('#0070c7'),
})
Object.assign(dark, {
  '--c-card': channels(CARD_DARK),
  '--c-surface-50': channels('#0a101d'),
  '--c-surface-100': channels('#0d1424'),
  '--c-surface-200': channels('#1b263b'),
  // Brand blue for chart marks on dark cards (dataviz validator: lightness band + ≥3:1 vs #0f1729).
  '--c-chart-1': channels('#1e9bf0'),
})

const themeColors = {
  slate: paletteFromVars('slate'),
  ...Object.fromEntries(Object.keys(ACCENTS).map((n) => [n, paletteFromVars(n)])),
  card: v('card'),
  surface: {
    DEFAULT: v('card'),
    50: v('surface-50'),
    100: v('surface-100'),
    200: v('surface-200'),
    800: colors.slate[800],
    900: colors.slate[900],
    950: '#070d1a',
  },
  chart: v('chart-1'),
  ink: { ...colors.slate, 950: '#020617' },
  // Un-themed accents for text on always-dark or colored backgrounds (e.g. text-fixed-brand-200).
  fixed: { brand, amber: colors.amber, emerald: colors.emerald, violet: colors.violet },
}

function themePlugin({ addBase }) {
  addBase({
    ':root': light,
    '.dark': dark,
    // Always-light islands inside a dark page (e.g. the document "paper" preview, which mirrors the PDF).
    '.theme-light': { ...light, colorScheme: 'light', color: 'rgb(var(--c-slate-900))' },
  })
}

module.exports = { themeColors, themePlugin, light, dark }
