/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crimson: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#F8B1B3', // Light coral
          400: '#F57F82', // Coral / Salmon
          500: '#e53e3e',
          600: '#D62026', // Bright red
          700: '#C8191E', // Deep red / Crimson
          800: '#9b1317',
          900: '#751013',
          950: '#450608',
        },
        coral: {
          light: '#F8B1B3',
          DEFAULT: '#F57F82',
          dark: '#E06568',
        },
        surface: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          card: '#FFFFFF',
          dark: '#171717',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(200, 25, 30, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 30px -4px rgba(200, 25, 30, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
        'crimson-glow': '0 0 25px -3px rgba(200, 25, 30, 0.3)',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
