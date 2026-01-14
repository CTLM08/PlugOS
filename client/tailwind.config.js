/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0f0f0f',
        'bg-card': '#1a1a1a',
        'bg-elevated': '#252525',
        'border': '#2a2a2a',
      }
    },
  },
  plugins: [],
}
