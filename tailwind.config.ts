import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#0a0a0f',
          surface: '#11131a',
          surfaceElevated: '#1a1d26',
          border: '#2a2e3a',
          borderSubtle: '#1e222d',
          text: '#e8e9ec',
          textMuted: '#8b8d94',
          textSubtle: '#5a5d66',
          accent: '#00d4aa',
          accentDim: '#00a888',
          accentBg: '#003d33',
          warning: '#ffb800',
          warningBg: '#3d2e00',
          danger: '#ff4757',
          dangerBg: '#3d0d12',
          info: '#00b4d8',
          infoBg: '#002d3d',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.7rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        'sm': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'base': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'lg': ['1.0625rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['2rem', { lineHeight: '1.2' }],
        '4xl': ['2.5rem', { lineHeight: '1.1' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'panel': '0 4px 24px -4px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
        'panel-hover': '0 8px 32px -4px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,170,0.15)',
        'glow-accent': '0 0 20px -4px rgba(0,212,170,0.4)',
        'glow-warning': '0 0 20px -4px rgba(255,184,0,0.4)',
        'glow-danger': '0 0 20px -4px rgba(255,71,87,0.4)',
      },
      transitionDuration: {
        'fast': '120ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config