/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      colors: {
        brandNavy: '#1B3A6B',
        brandAccent: '#2E75B6',
        alertGood: '#10B981',
        alertWarning: '#F59E0B',
        alertCritical: '#EF4444',
      }
    },
  },
  plugins: [],
}
