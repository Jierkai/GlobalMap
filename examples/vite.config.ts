import path from 'path';
import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [cesium()],
  resolve: {
    alias: [
      {
        find: '@cgx/layer/provider/xyz',
        replacement: path.resolve(__dirname, '../packages/layer/src/provider/xyz.ts'),
      },
      {
        find: '@cgx/layer/provider/wms',
        replacement: path.resolve(__dirname, '../packages/layer/src/provider/wms.ts'),
      },
      {
        find: '@cgx/layer/provider/wmts',
        replacement: path.resolve(__dirname, '../packages/layer/src/provider/wmts.ts'),
      },
      {
        find: '@cgx/layer/provider/singleTile',
        replacement: path.resolve(__dirname, '../packages/layer/src/provider/singleTile.ts'),
      },
      {
        find: /^@cgx\/(.*?)$/,
        replacement: path.resolve(__dirname, '../packages/$1/src'),
      },
    ],
  },
  server: {
    port: 3001,
    host: true,
  },
});
