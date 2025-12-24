/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#FF6B6B", // Vibrant Coral Red (CPU)
                secondary: "#4CC9F0", // Vibrant Sky Blue (Player)
                "surface-light": "#FFFFFF",
                "game-red": "#FF8888",
                "game-blue": "#72C4FF",
                accent: "#F9C74F", // Meteor Gold
                "text-main": "#333340",
                "powerup-purple": "#9D4EDD",
                "powerup-green": "#4CAF50",
                "powerup-orange": "#FF9800",
            },
            fontFamily: {
                display: ['"Fredoka"', 'cursive'],
                sans: ['"Nunito"', 'sans-serif'],
            },
            boxShadow: {
                game: "0 20px 40px -5px rgba(76, 201, 240, 0.35)",
                btn: "0 6px 0 rgba(0,0,0,0.1)",
                "btn-active": "0 2px 0 rgba(0,0,0,0.1)",
                powerup: "0 0 15px rgba(157, 78, 221, 0.6)",
                meteor: "0 0 20px rgba(249, 199, 79, 0.8)",
                combo: "0 0 20px rgba(255, 215, 0, 0.9)",
            },
            animation: {
                float: "float 3s ease-in-out infinite",
                "pulse-ring": "pulse-ring 1.5s infinite",
                "meteor-fall": "meteor-fall 0.5s ease-out forwards",
                "combo-pop": "combo-pop 0.3s ease-out forwards",
                "powerup-bounce": "powerup-bounce 1s infinite",
                "warning-flash": "warning-flash 0.8s infinite",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                "pulse-ring": {
                    "0%": { transform: "scale(0.8)", opacity: "0.8" },
                    "100%": { transform: "scale(2)", opacity: "0" },
                },
                "meteor-fall": {
                    "0%": { transform: "scale(0.5) translateY(-20px)", opacity: "0" },
                    "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
                },
                "combo-pop": {
                    "0%": { transform: "scale(1)", opacity: "1" },
                    "50%": { transform: "scale(1.3)", opacity: "0.9" },
                    "100%": { transform: "scale(1)", opacity: "0" },
                },
                "powerup-bounce": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-6px)" },
                },
                "warning-flash": {
                    "0%, 100%": { opacity: "1", transform: "scale(1)" },
                    "50%": { opacity: "0.8", transform: "scale(1.1)" },
                },
            },
        },
    },
    plugins: [],
};
