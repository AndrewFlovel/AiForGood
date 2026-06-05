/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        venaris: {
          primary: '#001E40',
          'primary-light': '#003366',
          secondary: '#1B6D24',
          tertiary: '#BA1A1A',
          dark: '#4A4A4A',
          light: '#F7F9FC',
        }
      },
      fontFamily: {
        sans: ['Hanken Grotesk', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
