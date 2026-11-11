import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER_PORT = process.env.FORGE_PORT ?? 4760;

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${SERVER_PORT}`,
      '/ws': { target: `ws://localhost:${SERVER_PORT}`, ws: true },
    },
  },
});
