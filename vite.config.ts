import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SPA fallback (every route serves index.html) is Vite's default for both
// `dev` and `preview`; production rewrites live in vercel.json.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Allow all hosts (needed for ngrok and similar tunneling services)
    allowedHosts: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
