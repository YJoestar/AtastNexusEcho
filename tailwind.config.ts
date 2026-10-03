/**
 * NEXUS ECHO — Design Token Configuration
 *
 * The bureau's visual DNA. Nine systems carry the whole institution:
 *
 *   1 border family      registration rules, corner brackets, file tabs
 *   2 typography system  four typographic "ages" (see fontFamily below)
 *   3 archive vocabulary document shells, registers, redactions, stamps
 *   4 status vocabulary  verified / unresolved / restricted / contradicted
 *   5 evidence system    evidence frames, tags, chain-of-custody rows
 *   6 signal system      signal integrity, node states, recording state
 *   7 classification    public / internal / restricted / restricted-source
 *   8 motion language    short, physical, never decorative
 *   9 anomaly language   structural wrongness, never visual noise
 *
 * Color is scarce on purpose. The institutional blue is the resting state,
 * cold cyan marks live evidence, amber is a warning, and red is reserved for
 * the handful of moments where it must mean something.
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
          // BASE — near-black, slightly warm so it never reads as "screen blue"
          bg: '#0a0a0b',
          // SURFACES — warm black / graphite / dark paper
          surface: '#101012',
          surfaceElevated: '#16161a',
          surfaceSubtle: '#0d0d0f',
          // Dark paper: recovered bureau stock, for documents and folders
          paper: '#1a1917',
          paperDeep: '#141312',

          // BORDER FAMILY
          border: '#2b2b2e',
          borderSubtle: '#1f1f22',
          // Interactive affordance: a border that acknowledges the pointer.
          borderHover: '#4a4a50',
          borderStrong: '#3d3d42',

          // TEXT — aged white, soft gray
          text: '#d8d6d0',
          textMuted: '#918f89',
          textSubtle: '#85837d',

          // ACTIVE EVIDENCE — cold cyan, used sparingly and with meaning
          accent: '#6fb3c4',
          accentDim: '#5b9aab',
          accentBg: '#0d2226',

          // WARNING — aged amber
          warning: '#b8863f',
          warningBg: '#241a0d',

          // CRITICAL — deep muted red. Rare. When it appears it matters.
          danger: '#cc6058',
          dangerBg: '#230f0e',

          // RESTRICTED — dark burgundy / black-red
          restricted: '#7c2f33',
          restrictedBg: '#1e0d0e',

          // SYSTEM — desaturated institutional blue
          blue: '#5a6b86',
          blueBg: '#141a22',

          info: '#5a6b86',
          infoBg: '#141a22',
          // Verified: a muted green, used only for confirmed / closed. Never decoration.
        verified: '#7fa88a',
        verifiedBg: '#0f1c14',
        success: '#6fb3c4',
          successBg: '#0d2226',
          inactive: '#4a4a4c',
          inactiveBg: '#17171a',
        },
      },
      fontFamily: {
        // Modern institutional type. Labels, headers, system chrome.
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        display: ['IBM Plex Sans Condensed', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        system: ['IBM Plex Sans Condensed', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        // Terminal / archival mono. Identifiers, timestamps, log lines.
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
        // Typewritten. 1970s-90s bureau documents and carbon copies.
        type: ['Courier Prime', 'Courier New', 'Courier', 'monospace'],
        // Human hand. Field annotations only — never machine material.
        hand: ['Segoe Script', 'Bradley Hand', 'Snell Roundhand', 'cursive'],
        // Evidence reading face.
        evidence: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.7rem', { lineHeight: '1.45', letterSpacing: '0.04em' }],
        'sm': ['0.8125rem', { lineHeight: '1.55', letterSpacing: '0.01em' }],
        'base': ['0.9375rem', { lineHeight: '1.65', letterSpacing: '0' }],
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
        // Shadows mean occlusion, not decoration: a lit document over a dark room.
        'panel': '0 1px 2px rgba(0,0,0,0.5)',
        'panel-elevated': '0 6px 18px rgba(0,0,0,0.55)',
        'lit': '0 0 0 1px rgba(216,214,208,0.04), 0 10px 30px rgba(0,0,0,0.6)',
        'pool': 'inset 0 1px 0 rgba(216,214,208,0.03)',
      },
      transitionDuration: {
        'fast': '120ms',
        'normal': '200ms',
        'slow': '320ms',
        'settle': '520ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        // Physical: something being set down, not something springing into place.
        'physical': 'cubic-bezier(0.16, 0.84, 0.44, 1)',
      },
      keyframes: {
        'materialize': {
          from: { opacity: '0', transform: 'translateY(3px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'settle': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'signal-acquire': {
          '0%': { opacity: '0.25', transform: 'scaleY(0.35)' },
          '60%': { opacity: '0.75' },
          '100%': { opacity: '1', transform: 'scaleY(1)' },
        },
        'relay': {
          '0%': { opacity: '0.4' },
          '40%': { opacity: '1' },
          '100%': { opacity: '0.4' },
        },
      },
      animation: {
        'materialize': 'materialize 200ms cubic-bezier(0.16, 0.84, 0.44, 1)',
        'settle': 'settle 320ms cubic-bezier(0.16, 0.84, 0.44, 1)',
        'signal-acquire': 'signal-acquire 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'relay': 'relay 900ms steps(1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
