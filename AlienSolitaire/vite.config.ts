import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This default base works when the project is published at
// https://USERNAME.github.io/AlienSolitaire/. See README.md for alternatives.
export default defineConfig({
  base: '/AlienSolitaire/',
  plugins: [react()]
});
