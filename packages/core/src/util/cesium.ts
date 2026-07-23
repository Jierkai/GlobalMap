/**
 * 在创建任何 Cesium 资源前设置静态资源根路径（Map3D 构造函数内部亦调用之）。
 *
 * Cesium 在首次创建 Worker 时才读取 `window.CESIUM_BASE_URL`，因此必须在
 * `new Map3D()` 之前调用；传入值原样透传，不做路径规范化（调用方负责）。
 */
export function setCesiumBaseUrl(url: string): void {
  ;(window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = url
}
