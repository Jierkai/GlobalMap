import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const publicPackageFiles = [
  'packages/core/**/*.ts',
  'packages/layer/**/*.ts',
  'packages/feature/**/*.ts',
  'packages/provider-cn/**/*.ts',
  'packages/sketch/**/*.ts',
  'packages/edit/**/*.ts',
  'packages/analysis/**/*.ts',
  'packages/history/**/*.ts',
  'packages/ui/**/*.ts',
  'packages/material/**/*.ts',
  'packages/effect/**/*.ts',
  'packages/adapter-vue/**/*.ts'
];

const boundaryPlugin = {
  rules: {
    'no-ts-nocheck': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow @ts-nocheck in CGX packages.'
        },
        schema: [],
        messages: {
          forbidden: 'Public packages must not use @ts-nocheck.'
        }
      },
      create(context) {
        return {
          Program(node) {
            for (const comment of context.sourceCode.getAllComments()) {
              if (/@ts-nocheck\b/.test(comment.value)) {
                context.report({
                  node,
                  loc: comment.loc.start,
                  messageId: 'forbidden'
                });
              }
            }
          }
        };
      }
    }
  }
};

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/legacy/**', '**/test-report/**', '**/coverage/**']
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: publicPackageFiles,
    ignores: ['packages/adapter-cesium/**', 'packages/reactive/**'],
    plugins: {
      'cgx-boundary': boundaryPlugin
    },
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'cesium',
            message: '公开包禁止 import cesium；Cesium 只能留在 packages/adapter-cesium。'
          },
          {
            name: '@cgx/adapter-cesium',
            message: '公开包禁止依赖内部 adapter-cesium。请通过 EngineAdapter/RenderSpec 解耦。'
          },
          {
            name: 'alien-signals',
            message: '只有 @cgx/reactive 可以直接依赖 alien-signals。'
          }
        ]
      }],
      'cgx-boundary/no-ts-nocheck': 'error'
    }
  },
  {
    files: ['packages/reactive/**/*.ts'],
    plugins: {
      'cgx-boundary': boundaryPlugin
    },
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'cesium',
            message: '@cgx/reactive 不应依赖 Cesium。'
          },
          {
            name: '@cgx/adapter-cesium',
            message: '@cgx/reactive 不应依赖内部 Cesium adapter。'
          }
        ]
      }],
      'cgx-boundary/no-ts-nocheck': 'error'
    }
  },
  {
    files: ['packages/adapter-cesium/**/*.ts'],
    plugins: {
      'cgx-boundary': boundaryPlugin
    },
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'alien-signals',
            message: '只有 @cgx/reactive 可以直接依赖 alien-signals。'
          }
        ]
      }],
      'cgx-boundary/no-ts-nocheck': 'error'
    }
  }
);
