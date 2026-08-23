/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: '#08090C',
        panel: '#111319',
        card: '#161922',
        accent: '#4F46E5',
      }
    },
  },
  plugins: [],
}
