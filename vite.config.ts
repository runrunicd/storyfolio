import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Relative base paths so the built app can be hosted at any subpath
  // (e.g. storyfolio.co/app/) via Worker proxy, and still load its
  // own /assets/* relative to the current URL.
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
