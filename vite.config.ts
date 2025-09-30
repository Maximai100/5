import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const devPort = Number(env.VITE_DEV_PORT ?? env.PORT ?? 5173);
  const enableHmr = env.VITE_ENABLE_HMR === 'true';
  const hmrHost = env.VITE_HMR_HOST || '';
  const hmrPort = env.VITE_HMR_PORT ? Number(env.VITE_HMR_PORT) : undefined;
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT ? Number(env.VITE_HMR_CLIENT_PORT) : undefined;

  const resolvedHmrConfig = (hmrHost || hmrPort || hmrClientPort)
    ? {
        host: hmrHost || undefined,
        port: hmrPort ?? devPort,
        clientPort: hmrClientPort ?? hmrPort ?? devPort,
        protocol: env.VITE_HMR_PROTOCOL || undefined
      }
    : undefined;

  const hmrConfig = enableHmr ? resolvedHmrConfig ?? {} : false;

  return {
    plugins: [react()],
    server: {
      host: true,
      port: devPort,
      strictPort: true,
      hmr: hmrConfig,
      // Disable caching for development
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    },
    // Удаляем console.* и debugger только в production
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : []
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              // Supabase
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // PDF libraries
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf-vendor';
              }
              // Google AI
              if (id.includes('@google/genai')) {
                return 'ai-vendor';
              }
              // Other vendor libraries (excluding React to avoid context issues)
              return 'vendor';
            }
            
            // App chunks - объединяем calculator с основным чанком для доступа к React
            if (id.includes('src/components/modals')) {
              return 'modals';
            }
            if (id.includes('src/components/views')) {
              return 'views';
            }
            if (id.includes('src/hooks')) {
              return 'hooks';
            }
            if (id.includes('src/services')) {
              return 'services';
            }
            if (id.includes('src/utils')) {
              return 'utils';
            }
            // calculator и context остаются в основном чанке
          },
          // Add hash to filenames for better caching
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    optimizeDeps: {
      include: ['jspdf', 'jspdf-autotable', 'react', 'react-dom'],
      force: true
    },
    define: {
      global: 'globalThis'
    }
  }
})
