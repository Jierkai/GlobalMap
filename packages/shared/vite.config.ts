import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
  },
  plugins: [
    dts({
      outDir: 'dist',
      tsconfigPath: fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
    }),
  ],
})
