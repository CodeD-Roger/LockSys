/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0b',
        'bg-secondary': '#111113',
        'bg-tertiary': '#18181b',
        'bg-elevated': '#1c1c1f',
        'accent-blue': '#3b82f6',
        'accent-blue-h': '#2563eb',
        'accent-green': '#22c55e',
        'accent-red': '#ef4444',
        'accent-amber': '#f59e0b',
        'text-pri': '#fafafa',
        'text-sec': '#a1a1aa',
        'text-ter': '#52525b',
      },
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Cascadia Code',
          'Consolas',
          'monospace',
        ],
      },
      borderColor: {
        subtle: 'rgba(255,255,255,0.06)',
        default: 'rgba(255,255,255,0.10)',
        strong: 'rgba(255,255,255,0.16)',
      },
    },
  },
  plugins: [],
};
