/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#06b6d4',
        slate: {
          355: '#b2becd',
          650: '#475569', // fallback slate-600/700
          850: '#1e293b', // fallback slate-800/900
        },
        indigo: {
          650: '#4f46e5',
        }
      },
      spacing: {
        '128': '32rem',
      },
      borderRadius: {
        'lg': '0.5rem',
      },
    },
  },
  plugins: [],
}
