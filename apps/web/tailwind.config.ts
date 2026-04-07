import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        shell: '#050816',
        panel: '#0f172a',
        border: '#1e293b',
        muted: '#94a3b8',
        accent: '#38bdf8',
        bull: '#22c55e',
        bear: '#f97316',
        neutral: '#a78bfa',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(56, 189, 248, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
