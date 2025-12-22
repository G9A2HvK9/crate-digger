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
        // Rekordbox-inspired palette
        background: '#000000',
        surface: '#1e1e1e',
        surfaceLight: '#222222',
        accent: '#00AABB',
        accentHover: '#00C4D4',
        text: '#FFFFFF',
        textMuted: '#CCCCCC',
      },
    },
  },
  plugins: [],
}

