import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@': resolve(__dirname, './src'),
    },
    env: {
      VITE_GEOAPIFY_API_KEY: '',
      VITE_CARTO_API_KEY: '',
      VITE_CARTO_THEME: '',
    },
  },
})
