import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5169,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ["7cd.nodemixaholic.com"]
  },
})
