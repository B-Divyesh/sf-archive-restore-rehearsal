import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: { host: '127.0.0.1' }
});
