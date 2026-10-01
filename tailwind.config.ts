/**
 * NEXUS ECHO — Design Token Configuration
 *
 * A restrained, archival visual system. Colors communicate meaning through
 * scarcity. Borders create structure without rounded-rectangle repetition.
 * Typography distinguishes NEXUS SYSTEM material from HUMAN EVIDENCE.
 */

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
          // Deep archival environment
          bg: '#080810',
          surface: '#0d1017',
          surfaceElevated: '#161821',
          surfaceSubtle: '#0f1219',

          // Border system — structured, not decorative
          border: '#2a2e3a',
          borderSubtle: '#222632',
          borderStrong: '#3a3f4d',

          // Typography
          text: '#e6e7ea',
          textMuted: '#9a9ba3',
          textSubtle: '#6a6b72',

          // NEXUS institutional accent — faded cyan, scarce and meaningful
          accent: '#5fd0c0',
          accentDim: '#4bb59d',
          accentBg: '#003333',

          // Warning — controlled amber
          warning: '#e6a326',
          warningBg: '#2e2200',

          // Critical — muted red
          danger: '#d94e48',
          dangerBg: '#2e1212',

          // Institutional blue — NEXUS infrastructure
          blue: '#5a6fa0',
          blueBg: '#1a1e2a',

          // System states
          info: '#5fd0c0',
          infoBg: '#003333',
          success: '#5fd0c0',
          successBg: '#003333',
          inactive: '#4a4a56',
          inactiveBg: '#1a1a22',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        // NEXUS SYSTEM — precise institutional type
        system: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        // HUMAN EVIDENCE — readable, evidence-focused
        evidence: ['Inter', 'system-ui', 'serif'],
      },
      fontSize: {
        'xs': ['0.7rem', { lineHeight: '1.4', letterSpacing: '0.03em' }],
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
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'none': '0',
      },
      boxShadow: {
        'panel': '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02)',
        'panel-elevated': '0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
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
