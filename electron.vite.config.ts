import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve('electron/main.ts') },
        output: { entryFileNames: '[name].js' }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/types'),
        '@lib': resolve('src/lib')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve('electron/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve('.'),
    resolve: {
      alias: {
        '@': resolve('src'),
        '@shared': resolve('src/types')
      }
    },
    build: {
      rollupOptions: {
        input: resolve('index.html')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
