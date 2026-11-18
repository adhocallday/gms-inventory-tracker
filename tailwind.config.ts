import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Theme values live as CSS variables in app/globals.css (--color-*,
      // --mf-*). The unused --g-* spacing/type/color utilities were removed.
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        'mf-red': 'var(--mf-red)',
        'mf-ink': 'var(--mf-ink)',
        // MerchFlow Charts' Tailwind 4 theme tokens (merch-flow-charts
        // app/globals.css @theme), same values, for the vendored report.
        ink: '#111214',
        app: '#F7F7F8',
        'gms-red': '#E8003D',
        'chart-1': '#E8003D',
        'chart-2': '#0082F3',
        'chart-3': '#C77400',
        'chart-4': '#00A36F',
        'chart-5': '#9B5FC0',
      },
      borderRadius: {
        app: '10px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
