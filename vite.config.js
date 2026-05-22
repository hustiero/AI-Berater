import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` -> funktioniert sowohl lokal als auch unter beliebiger
// GitHub-Pages-URL (z.B. https://<user>.github.io/AI-Berater/).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
});
