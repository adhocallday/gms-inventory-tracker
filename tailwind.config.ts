import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Map CSS custom properties to Tailwind utilities
      spacing: {
        'g-1': 'var(--g-1)',
        'g-2': 'var(--g-2)',
        'g-3': 'var(--g-3)',
        'g-4': 'var(--g-4)',
        'g-5': 'var(--g-5)',
        'g-6': 'var(--g-6)',
        'g-8': 'var(--g-8)',
        'g-10': 'var(--g-10)',
        'g-12': 'var(--g-12)',
        'g-16': 'var(--g-16)',
      },
      fontSize: {
        'g-h1': 'var(--g-h1)',
        'g-h2': 'var(--g-h2)',
        'g-h3': 'var(--g-h3)',
        'g-body': 'var(--g-body)',
        'g-small': 'var(--g-small)',
      },
      colors: {
        'g-bg': 'var(--g-bg)',
        'g-bg-muted': 'var(--g-bg-muted)',
        'g-surface': 'var(--g-surface)',
        'g-surface-2': 'var(--g-surface-2)',
        'g-text': 'var(--g-text)',
        'g-text-muted': 'var(--g-text-muted)',
        'g-text-dim': 'var(--g-text-dim)',
        'g-accent': 'var(--g-accent)',
        'g-accent-2': 'var(--g-accent-2)',
        'g-border': 'var(--g-border)',
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
