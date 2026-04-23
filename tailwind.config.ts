import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ghibli-warm cream scale — wheat-paper rather than pale ivory.
        // Hue sits around 40° (warm tan) across the scale so each step
        // reads as the same paper, just darker.
        cream: {
          50:  '#FBF6E6',
          100: '#F0E9D6',
          200: '#E8DFC6',
          300: '#D6C7A5',
          400: '#B89C6F',
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
