import { UrlTemplateLayer } from './UrlTemplateLayer'
import type { OsmLayerOptions } from '../type'

/**
 * OpenStreetMap 图层（图层域设计文档 §4.2.5）。
 *
 * - 默认 URL：`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
 *   - 子域名 `a/b/c`
 * - `maximumLevel` 默认 19
 * - `credit` 默认 `'OpenStreetMap contributors'`
 */
export class OsmLayer extends UrlTemplateLayer {
  readonly type = 'osm'

  constructor(options: OsmLayerOptions = {}) {
    super({
      id: options.id,
      show: options.show,
      url: options.url ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: options.subdomains ?? ['a', 'b', 'c'],
      maximumLevel: 19,
      credit: 'OpenStreetMap contributors',
      zIndex: options.zIndex,
    })
  }
}
