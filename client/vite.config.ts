import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// The API server (server/) listens here in development. Override with
// VITE_API_TARGET if you run it elsewhere. Production builds should be served
// same-origin with the API (or behind one reverse proxy) so the session cookie
// is sent with `/api` requests.
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@client': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    // ! HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      // Same-origin `/api/*` in the browser → Express. No path rewrite: the
      // server mounts its routers under /api too.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
