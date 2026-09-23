import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  base: './', // Ensures relative asset paths for GitHub Pages and all hosting providers
  server: {
    port: 3000,
    open: true
  }
})
