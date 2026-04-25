import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Cgx',
  description: 'Modern DX layer for CesiumJS',
  base: '/cgx/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Recipes', link: '/recipes/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Installation', link: '/guide/installation' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Signals', link: '/guide/signals' },
            { text: 'Commands & History', link: '/guide/history' },
          ],
        },
      ],
      '/recipes/': [
        {
          text: 'Recipes',
          items: [
            { text: 'Overview', link: '/recipes/' },
            { text: 'Hello Viewer', link: '/recipes/hello-viewer' },
            { text: 'Imagery Layer', link: '/recipes/imagery-layer' },
            { text: 'Draw Polygon', link: '/recipes/draw-polygon' },
            { text: 'Edit Feature', link: '/recipes/edit-feature' },
            { text: 'Buffer Analysis', link: '/recipes/buffer-analysis' },
            { text: 'Profile Analysis', link: '/recipes/profile-analysis' },
            { text: 'Viewshed Analysis', link: '/recipes/viewshed-analysis' },
            { text: 'Custom Popup', link: '/recipes/custom-popup' },
            { text: 'Custom Material', link: '/recipes/custom-material' },
            { text: 'Vue3 Integration', link: '/recipes/vue3-integration' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/cgx/cgx' },
    ],
  },
});
