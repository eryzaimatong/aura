import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The API's CORS list allows 5173 only; fail loudly instead of drifting to 5174.
  server: { port: 5173, strictPort: true },
});
