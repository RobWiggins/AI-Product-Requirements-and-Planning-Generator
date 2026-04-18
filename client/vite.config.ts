// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import path from "path";

// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: { "@client": path.resolve(__dirname, "src") },
//   },
//   server: {
//     port: 3000,
//     proxy: {
//       "/api": { target: "http://localhost:3001", changeOrigin: true },
//     },
//   },
// });



import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // ! HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to ``pre``vent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        "/api": 
        { 
          target: "http://localhost:3000", 
          changeOrigin: true 
        },
        // port: 3000,
        // '/api': 'http://localhost:3000' 
      },
    },
  };
});
