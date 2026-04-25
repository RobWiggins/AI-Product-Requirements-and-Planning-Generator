import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      // port: 3001,
      strictPort: true,
      // ! HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to ``pre``vent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        "/api": 
        { 
          // TODO what do do about this?, avoid hardcode? env var? but then we have to ensure it's set in the environment when running the client, which adds complexity.
          // target: "http://localhost:3000",
          target: "http://localhost:3001",

          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      },
    },
  };
});
