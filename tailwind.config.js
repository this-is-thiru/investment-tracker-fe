/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"  // Scan all Angular HTML + TS files
  ],
  theme: {
    extend: {
      fontFamily: {
        racing: ["'Racing Sans One'", "sans-serif"],
      },
    },
  },
  plugins: [],
}