// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { buildElement, buildSvg, parseHtmlNodes } from '../src/util/dom';

describe('DOM Utilities', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should build an element and append to root', () => {
    const el = buildElement('span', 'test-class', container);
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('test-class');
    expect(container.childNodes.length).toBe(1);
    expect(container.firstChild).toBe(el);
  });

  it('should build an svg element', () => {
    const svg = buildSvg(100, 200, '#icon', container);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('100');
    expect(svg.getAttribute('height')).toBe('200');
    expect(svg.childNodes.length).toBe(1);
    expect((svg.firstChild as Element).tagName.toLowerCase()).toBe('use');
  });

  it('should parse HTML string into nodes', () => {
    const htmlStr = '<p>hello</p><span>world</span>';
    const nodes = parseHtmlNodes(htmlStr);
    expect(nodes.length).toBe(2);
    expect((nodes[0] as HTMLElement).tagName).toBe('P');
    expect((nodes[1] as HTMLElement).tagName).toBe('SPAN');
  });
});
