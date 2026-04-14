import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => '/v1/messages',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward the API key from custom header
            const apiKey = req.headers['x-api-key'];
            if (apiKey) {
              proxyReq.setHeader('x-api-key', apiKey);
            }
            proxyReq.setHeader('anthropic-version', '2024-10-22');
            // Remove headers that Anthropic doesn't want
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
})
