import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          // React 19 requires react + react-dom in the same chunk (shared ReactSharedInternals)
          if (id.includes('node_modules/react')) return 'vendor-react';
        },
      },
    },
  },
})
