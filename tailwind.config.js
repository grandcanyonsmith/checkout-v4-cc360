/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Helvetica Neue', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f8ff',
          100: '#e0f0ff',
          200: '#c7e3ff',
          300: '#a6d0ff',
          400: '#7bb8ff',
          500: '#0475FF',
          600: '#035ce6',
          700: '#0349cc',
          800: '#0236b3',
          900: '#111D2C',
        },
        brand: {
          'primary': '#0475FF',
          'dark': '#111D2C',
          'darker': '#0E325E',
          'black': '#000000',
          'accent': '#E2FF00',
          'danger': '#FF2F00',
          'gray-dark': '#131313',
          'create': '#1D4ED8',
          'market': '#E2FF00',
          'sellscale': '#FF2F00',
        },
        blue: {
          primary: '#0475FF',
          dark: '#0E325E',
          darker: '#111D2C',
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'slide-in': {
          '0%': {
            opacity: '0',
            maxHeight: '0'
          },
          '100%': {
            opacity: '1',
            maxHeight: '300px'
          },
        }
      }
    },
  },
  plugins: [],
} 