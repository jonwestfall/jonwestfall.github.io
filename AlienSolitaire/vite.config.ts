import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// This default base works when the project is published at
// https://USERNAME.github.io/AlienSolitaire/. See README.md for alternatives.
export default defineConfig({
  base: '/AlienSolitaire/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'app.html')
    }
  }
});
