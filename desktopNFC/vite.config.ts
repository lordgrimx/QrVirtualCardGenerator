import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [process.cwd(), path.resolve(__dirname, '../expoNFC/assets')]
    }
  },
  build: {
    outDir: 'dist'
  }
});


