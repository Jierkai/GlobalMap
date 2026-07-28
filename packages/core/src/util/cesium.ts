/**
 * Cesium 静态资源根路径自动识别（设计文档 §5.7）。
 *
 * 探测链：window.CESIUM_BASE_URL 已设（npm 依赖场景：打包器插件注入）
 *   -> script 标签探测（lib 场景：Cesium.js 的 src 推导目录）
 *   -> 约定值 /cesium + dev 警告。
 */

/**
 * 从 document.scripts 中探测 Cesium.js 的 src 并推导其所在目录。
 * 匹配 src 以 `Cesium.js`（大小写不敏感）结尾的 script 标签。
 */
function detectFromScriptTag(): string | undefined {
  const scripts = document.querySelectorAll('script')
  for (const script of scripts) {
    // 用 getAttribute('src') 取原始属性值，避免 jsdom/浏览器将相对 URL 解析为绝对 URL
    const src = script.getAttribute('src')
    if (!src) continue
    // 匹配以 Cesium.js 结尾（忽略大小写）
    if (/cesium\.js$/i.test(src)) {
      // 取 src 去掉文件名的目录部分
      return src.replace(/[^/]*$/i, '').replace(/\/$/, '')
    }
  }
  return undefined
}

/**
 * 自动识别 Cesium 静态资源根路径（设计文档 §5.7）。
 *
 * ① window.CESIUM_BASE_URL 已设（npm 依赖：vite-plugin-cesium / DefinePlugin 注入）直接用；
 * ② script 标签探测（lib 场景：Cesium.js 的 src 推导目录）命中用；
 * ③ 回退 '/cesium' 并 console.warn 引导装插件。
 */
export function resolveCesiumBaseUrl(): string {
  const global = (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL
  if (global) return global

  const detected = detectFromScriptTag()
  if (detected) return detected

  console.warn(
    '[GlobalMap] 未检测到 Cesium 静态资源路径（window.CESIUM_BASE_URL 未设、未找到 Cesium.js script 标签）。' +
      '回退为 "/cesium"。如遇 404，请安装打包器插件：npm+Vite 用 vite-plugin-cesium，' +
      'npm+Webpack 用 copy-webpack-plugin + DefinePlugin。',
  )
  return '/cesium'
}
