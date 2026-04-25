import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/legacy/**', '**/test-report/**']
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'packages/layer/**/*.ts',
      'packages/feature/**/*.ts',
      'packages/core/**/*.ts',
      'packages/provider-cn/**/*.ts',
      'packages/sketch/**/*.ts',
      'packages/edit/**/*.ts',
      'packages/analysis/**/*.ts',
      'packages/history/**/*.ts',
      'packages/ui/**/*.ts',
      'packages/material/**/*.ts'
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'cesium',
          message: 'L2+ 禁止运行时 import \'cesium\'，仅允许 import type'
        }]
      }]
    }
  }
);