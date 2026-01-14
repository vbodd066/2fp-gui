// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0A0F23",      // dark background
        secondary: "#A3AFC2",    // light secondary text
        accent: "#5D9CEC",       // bright accent
        "codeBg": "#1E2330",     // code block bg
        "codeText": "#D6DEEB",   // code block text
      },
    },
  },
  plugins: [],
};
