import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Cache-Control headers so avatars and static assets aren't re-downloaded every visit
      headers: {
        // Avatar images: cache for 1 hour in browser
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
    build: {
      // Split large dependencies into separate chunks — faster initial load
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-three':    ['three', '@react-three/fiber', '@react-three/drei'],
            'vendor-motion':   ['motion/react'],
            'vendor-lucide':   ['lucide-react'],
          },
        },
      },
      // Warn if a chunk exceeds 1MB (down from default 500KB)
      chunkSizeWarningLimit: 1000,
    },
  };
});
