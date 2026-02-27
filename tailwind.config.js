/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#020408', // Deepest River Black
                surface: '#0B1021',    // Deep Navy Surface
                primary: '#38BDF8',    // Sky Blue / River Light
                secondary: '#3B82F6',  // Ocean Blue
                accent: '#06B6D4',     // Cyan Electric
                foreground: '#F0F9FF', // Alice Blue
                muted: '#64748B',      // Slate
                'glass-border': 'rgba(255, 255, 255, 0.08)',
                'glass-surface': 'rgba(255, 255, 255, 0.03)',
                'glass-highlight': 'rgba(255, 255, 255, 0.1)',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],     // Modern geometric sans (Body)
                display: ['Outfit', 'sans-serif'], // High-impact display
                mono: ['Rajdhani', 'monospace'],    // Tech accents (keep for small details)
            },
            backgroundImage: {
                'river-gradient': 'linear-gradient(to bottom right, #020408, #0B1021, #020408)',
                'glass-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.00) 100%)',
                'glow-conic': 'conic-gradient(from 180deg at 50% 50%, #38BDF8 0deg, #3B82F6 180deg, #06B6D4 360deg)',
            },
            animation: {
                'flow': 'flow 10s ease-in-out infinite',
                'float-slow': 'float 8s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up-fade': 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'gradient-x': 'gradient 8s ease infinite',
            },
            keyframes: {
                flow: {
                    '0%, 100%': { transform: 'translateY(0) scale(1)' },
                    '50%': { transform: 'translateY(-20px) scale(1.05)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.1)' },
                },
                slideUpFade: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                gradient: {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    },
                },
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
            },
        },
    },
    plugins: [],
}
