/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#e54b65', 600: '#b72843', 700: '#800000', 800: '#650000', 900: '#450a0a' },
      },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgb(15 23 42 / 0.05)' },
    },
  },
  plugins: [],
}
