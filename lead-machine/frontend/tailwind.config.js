/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0D0D10",
                foreground: "#EBEBEB",
                primary: "#6366f1",
                secondary: "#1E1E24"
            }
        },
    },
    plugins: [],
}
