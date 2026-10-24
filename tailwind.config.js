const { colorTokens, radius, typeScale, fontFamily, touch } = require('./src/theme/tokens.ts');

const px = (n) => `${n}px`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(
        colorTokens.map((t) => [t, `rgb(var(--color-${t}) / <alpha-value>)`]),
      ),
      borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, px(v)])),
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([k, [size, line]]) => [k, [px(size), px(line)]]),
      ),
      fontFamily: Object.fromEntries(Object.entries(fontFamily).map(([k, v]) => [k, [v]])),
      minHeight: { touch: px(touch.min), log: px(touch.log) },
      minWidth: { touch: px(touch.min), log: px(touch.log) },
    },
  },
  plugins: [],
};
