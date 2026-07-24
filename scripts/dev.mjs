#!/usr/bin/env node
/**
 * 开发服务器薄封装：等价于 `pnpm --filter @globalmap/example dev`，带中文提示与退出码透传。
 */
import { spawn } from 'node:child_process'

console.log('[GlobalMap] 启动 example 开发服务器…')

const child = spawn('pnpm', ['--filter', '@globalmap/example', 'dev'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[GlobalMap] 开发服务器异常退出（退出码 ${code}）`)
  }
  process.exit(code ?? 1)
})
