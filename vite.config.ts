import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase'))      return 'vendor-supabase';
          if (id.includes('node_modules/@tanstack'))      return 'vendor-query';
          if (id.includes('node_modules/@radix-ui'))      return 'vendor-ui';
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/react/'))         return 'vendor-react';
        },
      },
    },
  },
})
