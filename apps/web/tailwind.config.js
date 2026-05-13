/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#121417",
          700: "#3D4451",
          500: "#6B7280"
        },
        pulse: {
          50: "#EDFDF8",
          100: "#D3F8EA",
          500: "#14B88A",
          600: "#0E9270"
        }
      },
      boxShadow: {
        soft: "0 16px 40px rgb(18 20 23 / 0.08)"
      }
    }
  },
  plugins: []
};
