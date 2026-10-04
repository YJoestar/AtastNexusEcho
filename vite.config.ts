import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@types': path.resolve(__dirname, './src/types'),
      '@content': path.resolve(__dirname, './src/content'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Only stable, always-needed vendor code is pinned to a named chunk.
        // Heavy, rarely used libraries (jspdf, html2canvas, jsqr, qrcode, dompurify)
        // are left to Rollup so they stay in their dynamic-import chunks.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          const pkg = (name: string) => id.includes(`/node_modules/${name}/`)
          if (pkg('react') || pkg('react-dom') || pkg('scheduler') || pkg('react-router') || pkg('react-router-dom') || pkg('@remix-run/router')) return 'vendor'
          if (id.includes('/node_modules/@supabase/')) return 'supabase'
          if (pkg('gsap')) return 'gsap'
          if (pkg('zod') || pkg('clsx') || pkg('tailwind-merge')) return 'utils'
          return undefined
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    // Tests must not depend on a developer's .env.local.
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})