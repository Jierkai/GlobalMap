/**
 * 实例化常规 DOM 节点
 * @param tag 元素标签名称
 * @param cssClass 附加的 CSS 类名
 * @param root 父级挂载节点
 * @returns 创建的 DOM 节点
 */
export function buildElement(tag: string, cssClass?: string, root?: HTMLElement | null): HTMLElement {
  const node = document.createElement(tag);
  if (cssClass) node.className = cssClass;
  if (root) root.appendChild(node);
  return node;
}

/**
 * 实例化 SVG 矢量节点
 * @param w 宽度
 * @param h 高度
 * @param href 内部 href 路径
 * @param root 父级挂载节点
 * @returns 创建的 SVG 节点
 */
export function buildSvg(w: number, h: number, href: string, root?: HTMLElement): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svgNode = document.createElementNS(ns, 'svg');
  svgNode.setAttribute('width', String(w));
  svgNode.setAttribute('height', String(h));
  
  const useNode = document.createElementNS(ns, 'use');
  useNode.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
  svgNode.appendChild(useNode);
  
  if (root) root.appendChild(svgNode);
  return svgNode;
}

/**
 * 实例化视频流节点
 * @param sourceUrl 视频源地址
 * @param mimeType 媒体 MIME 类型
 * @param cssClass 附加的 CSS 类名
 * @param root 父级挂载节点
 * @returns 创建的 Video 节点
 */
export function buildVideo(sourceUrl: string, mimeType?: string, cssClass?: string, root?: HTMLElement | null): HTMLVideoElement {
  const vidNode = document.createElement('video');
  if (cssClass) vidNode.className = cssClass;
  
  vidNode.autoplay = true;
  vidNode.loop = true;
  vidNode.muted = true;
  vidNode.playsInline = true;
  
  if (mimeType) {
    const srcNode = document.createElement('source');
    srcNode.src = sourceUrl;
    srcNode.type = mimeType;
    vidNode.appendChild(srcNode);
  } else {
    vidNode.src = sourceUrl;
  }
  
  if (root) root.appendChild(vidNode);
  return vidNode;
}

/**
 * 通过解析 HTML 字符串生成实体节点
 * @param htmlString HTML 源文本
 * @returns 生成的节点集合
 */
export function parseHtmlNodes(htmlString: string): NodeListOf<ChildNode> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = htmlString;
  return wrapper.childNodes;
}
