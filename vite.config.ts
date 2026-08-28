import { defineConfig } from 'vite';

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) || 'local') },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: { host: '127.0.0.1' }
});
