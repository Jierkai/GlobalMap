import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import cesium from 'vite-plugin-cesium'
import path from 'path'

export default defineConfig({
  plugins: [cesium()],
  resolve: {
    alias: [
      {
        // 匹配所有的 @cgx/ 模块
        find: /^@cgx\/(.*?)$/,
        // 将它们统统指向本地的 packages/对应的模块/src 目录
        replacement: path.resolve(__dirname, './packages/$1/src')
      }
    ]
      
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CesiumMap',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['cesium'],
      output: {
        globals: {
          cesium: 'Cesium'
        }
      }
    }
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
    reporters: ['default', 'json', 'html'],
    outputFile: {
      json: './test-report/results.json',
      html: './test-report/index.html'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-report/coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/main.ts',
        'src/**/*.d.ts',
        'node_modules/**'
      ]
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    deps: {
      interopDefault: true,
      inline: ['cesium']
    },
    server: {
      deps: {
        inline: ['cesium', '@cesium/engine']
      }
    }
  }
})