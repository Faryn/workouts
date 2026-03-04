import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildVersion = `${Date.now()}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
  server: { port: 5173 }
})
