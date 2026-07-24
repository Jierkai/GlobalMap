#!/usr/bin/env node
/**
 * 整仓构建薄封装：等价于 `pnpm -r build`，带中文提示与退出码透传。
 */
import { spawn } from 'node:child_process'

console.log('[GlobalMap] 开始整仓构建（pnpm -r build）…')

const child = spawn('pnpm', ['-r', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('close', (code) => {
  if (code === 0) {
    console.log('[GlobalMap] 构建成功 ✓')
  } else {
    console.error(`[GlobalMap] 构建失败（退出码 ${code}）`)
  }
  process.exit(code ?? 1)
})
