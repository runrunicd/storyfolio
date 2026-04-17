import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FDFCFA',
          100: '#FAF7F2',
          200: '#F0EBE1',
          300: '#E2D9CC',
          400: '#C8B99A',
        },
        ochre: {
          400: '#D4A54A',
          500: '#C8913A',
          600: '#A87530',
        },
        moss: {
          400: '#9AAB8C',
          500: '#7A8C6E',
          600: '#5C6E52',
        },
        ink: {
          500: '#4A4540',
          700: '#2C2825',
          900: '#1A1714',
        },
        'dusty-rose': '#D4A096',
        midnight: '#2C3A5C',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft:   '0 2px 8px rgba(74, 69, 64, 0.08)',
        medium: '0 4px 16px rgba(74, 69, 64, 0.12)',
        lifted: '0 8px 24px rgba(74, 69, 64, 0.16)',
      },
    },
  },
  plugins: [],
} satisfies Config
