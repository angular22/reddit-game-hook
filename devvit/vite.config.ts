import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const isServer = mode === 'server';

  if (isServer) {
    return {
      build: {
        outDir: 'dist/server',
        emptyOutDir: true,
        ssr: true,
        target: 'node22',
        rollupOptions: {
          input: resolve(__dirname, 'src/server/index.ts'),
          output: {
            entryFileNames: 'index.cjs',
            format: 'cjs',
            inlineDynamicImports: true,
          },
        },
      },
      ssr: {
        target: 'node',
        noExternal: true,
      },
    };
  }

  return {
    root: 'src/client',
    plugins: [react()],
    publicDir: resolve(__dirname, 'assets'),
    build: {
      outDir: resolve(__dirname, 'dist/client'),
      emptyOutDir: true,
      target: 'es2022',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/client/index.html'),
        },
      },
    },
  };
});
