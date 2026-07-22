import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/.vitepress/cache/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  prettier,
]
