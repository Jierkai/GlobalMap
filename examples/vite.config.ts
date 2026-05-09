import path from 'path';
import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [cesium()],
  resolve: {
    alias: [
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
