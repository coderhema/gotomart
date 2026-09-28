/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cream': '#faf9f6',
        'cream-dark': '#f1eee9',
        'navy': '#0007cb',
        'gray-text': '#585858',
        'light-gray': '#dedbd6',
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
