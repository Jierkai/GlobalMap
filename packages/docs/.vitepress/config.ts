import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'GlobalMap',
  description: '基于 Cesium 二次封装的三维地图库',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: 'Cesium 静态资源', link: '/guide/cesium-base-url' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API',
          items: [{ text: '总览', link: '/api/' }],
        },
      ],
    },
  },
})
