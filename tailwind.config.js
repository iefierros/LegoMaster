/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lego: {
          yellow: '#FFCB05',
          red: '#D01012',
          blue: '#0055BF',
          black: '#000000',
          gray: '#58595B'
        }
      }
    },
  },
  plugins: [],
}
