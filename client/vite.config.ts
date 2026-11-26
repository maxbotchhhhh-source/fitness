import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// В режиме разработки запросы /api проксируются на Express (порт 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.tuna.am'], // чтобы dev-сервер открывался и через туннель tuna.am
    proxy: { '/api': 'http://localhost:3000' },
  },
});
