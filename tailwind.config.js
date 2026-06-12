/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f1e',
        surface: '#111827',
        card: '#1e293b',
        border: '#334155',
        gold: '#f59e0b',
        win: '#4ade80',
        danger: '#ef4444',
        info: '#60a5fa',
        muted: '#64748b',
        subtle: '#94a3b8',
      },
    },
  },
  plugins: [],
}
