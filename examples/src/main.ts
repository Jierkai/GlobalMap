import './styles.css';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import 'monaco-editor/min/vs/editor/editor.main.css';

import * as Cesium from 'cesium';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TypeScriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import * as CgxCesium from '@cgx/adapter-cesium';
import { createCesiumAdapter } from '@cgx/adapter-cesium';
import * as CgxCore from '@cgx/core';
import { createCgxViewer, type CgxViewer, type EngineAdapter } from '@cgx/core';

type Cleanup = () => void | Promise<void>;

interface ExampleSnippet {
  id: string;
  title: string;
  code: string;
}

interface RuntimeState {
  viewer: CgxViewer | undefined;
  cleanup: Cleanup | undefined;
}

interface RuntimeContext {
  Cesium: typeof Cesium;
  viewer: CgxViewer;
  adapter: EngineAdapter;
  cesiumViewer: Cesium.Viewer;
  container: HTMLElement;
  cgx: {
    core: typeof CgxCore;
    cesium: typeof CgxCesium;
  };
}

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

const examples: ExampleSnippet[] = [
  {
    id: 'cgx-point',
    title: 'CGX 点与线',
    code: `const center = [116.391, 39.907, 500];

cesiumViewer.imageryLayers.removeAll();
cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#2d3327');
cesiumViewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#111315');

const point = adapter.mountFeature?.({
  id: 'beijing-marker',
  kind: 'point',
  position: center,
  point: {
    pixelSize: 14,
    color: Cesium.Color.fromCssColorString('#ffcf5a'),
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 2,
  },
  label: {
    text: 'CGX Marker',
    pixelOffset: [0, -24],
    fillColor: Cesium.Color.WHITE,
    showBackground: true,
    backgroundColor: Cesium.Color.fromCssColorString('#111315').withAlpha(0.72),
  },
});

const route = adapter.mountFeature?.({
  id: 'route',
  kind: 'polyline',
  positions: [
    [116.25, 39.82, 0],
    [116.39, 39.91, 0],
    [116.55, 40.01, 0],
  ],
  polyline: {
    width: 4,
    material: Cesium.Color.fromCssColorString('#4fd1c5'),
  },
});

cesiumViewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(116.391, 39.907, 1800000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-65),
    roll: 0,
  },
  duration: 0,
});

return () => {
  point?.dispose();
  route?.dispose();
};`,
  },
  {
    id: 'native-entities',
    title: 'Cesium 原生 Entity',
    code: `cesiumViewer.imageryLayers.removeAll();
cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#202c32');

const cities = [
  ['Shanghai', 121.4737, 31.2304],
  ['Hangzhou', 120.1551, 30.2741],
  ['Nanjing', 118.7969, 32.0603],
];

for (const [name, lng, lat] of cities) {
  cesiumViewer.entities.add({
    name,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, 200),
    point: {
      pixelSize: 11,
      color: Cesium.Color.fromCssColorString('#f97316'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: name,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
    },
  });
}

cesiumViewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(120.3, 31.1, 900000),
  orientation: {
    heading: Cesium.Math.toRadians(18),
    pitch: Cesium.Math.toRadians(-52),
    roll: 0,
  },
});`,
  },
  {
    id: 'geojson-layer',
    title: 'GeoJSON 数据层',
    code: `cesiumViewer.imageryLayers.removeAll();
cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#263123');

const geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Demo Zone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [113.8, 22.45],
          [114.25, 22.45],
          [114.25, 22.82],
          [113.8, 22.82],
          [113.8, 22.45],
        ]],
      },
    },
  ],
};

const layer = adapter.mountLayer?.({
  id: 'demo-geojson',
  kind: 'data',
  sourceType: 'geojson',
  payload: geojson,
  options: {
    stroke: Cesium.Color.fromCssColorString('#22c55e'),
    fill: Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.32),
    strokeWidth: 3,
  },
});

cesiumViewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(114.02, 22.62, 420000),
  duration: 0,
});

return () => layer?.dispose();`,
  },
];

window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new TypeScriptWorker();
    }

    return new EditorWorker();
  },
};

const runtime: RuntimeState = {
  viewer: undefined,
  cleanup: undefined,
};
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root element.');
}

app.innerHTML = `
  <main class="shell">
    <section class="workbench" aria-label="代码编辑区">
      <header class="bar editor-bar">
        <div>
          <p class="eyebrow">CGX Sandcastle</p>
          <h1>Example Runner</h1>
        </div>
        <div class="toolbar">
          <select id="exampleSelect" aria-label="选择示例"></select>
          <button id="resetButton" class="button ghost" type="button">Reset</button>
          <button id="runButton" class="button primary" type="button">Run</button>
        </div>
      </header>
      <div id="editor" class="editor"></div>
    </section>
    <section class="preview-panel" aria-label="运行预览区">
      <header class="bar preview-bar">
        <span id="statusDot" class="status-dot idle" aria-hidden="true"></span>
        <span id="statusText">Idle</span>
      </header>
      <div id="previewRoot" class="preview-root"></div>
      <pre id="errorPanel" class="error-panel" hidden></pre>
    </section>
  </main>
`;

const editorHost = query<HTMLDivElement>('#editor');
const previewRoot = query<HTMLDivElement>('#previewRoot');
const errorPanel = query<HTMLPreElement>('#errorPanel');
const statusDot = query<HTMLSpanElement>('#statusDot');
const statusText = query<HTMLSpanElement>('#statusText');
const runButton = query<HTMLButtonElement>('#runButton');
const resetButton = query<HTMLButtonElement>('#resetButton');
const exampleSelect = query<HTMLSelectElement>('#exampleSelect');

for (const example of examples) {
  const option = document.createElement('option');
  option.value = example.id;
  option.textContent = example.title;
  exampleSelect.append(option);
}

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  allowNonTsExtensions: true,
  checkJs: false,
  target: monaco.languages.typescript.ScriptTarget.ES2020,
});

const codeEditor = monaco.editor.create(editorHost, {
  value: examples[0]?.code ?? '',
  language: 'javascript',
  theme: 'vs-dark',
  automaticLayout: true,
  fontFamily: '"Berkeley Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: 14,
  lineHeight: 22,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  tabSize: 2,
  padding: { top: 18, bottom: 18 },
});

exampleSelect.addEventListener('change', () => {
  const selected = examples.find((example) => example.id === exampleSelect.value);
  if (selected) {
    codeEditor.setValue(selected.code);
  }
});

runButton.addEventListener('click', () => {
  void runCode();
});

resetButton.addEventListener('click', () => {
  const selected = examples.find((example) => example.id === exampleSelect.value) ?? examples[0];
  if (selected) {
    codeEditor.setValue(selected.code);
  }
});

window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    void runCode();
  }
});

void runCode();

function query<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }

  return element;
}

async function runCode(): Promise<void> {
  setStatus('running', 'Running');
  errorPanel.hidden = true;
  runButton.disabled = true;

  try {
    await resetRuntime();

    const container = document.createElement('div');
    container.className = 'cesium-stage';
    previewRoot.append(container);

    const adapter = createCesiumAdapter({ shouldAnimate: true });
    const viewer = createCgxViewer({ container, adapter });
    runtime.viewer = viewer;

    await viewer.ready();

    const cesiumViewer = adapter.unsafeNative?.() as Cesium.Viewer | undefined;
    if (!cesiumViewer) {
      throw new Error('Cesium Viewer was not created.');
    }

    configurePreview(cesiumViewer);

    const context: RuntimeContext = {
      Cesium,
      viewer,
      adapter,
      cesiumViewer,
      container,
      cgx: {
        core: CgxCore,
        cesium: CgxCesium,
      },
    };
    const cleanup = await executeUserCode(codeEditor.getValue(), context);

    if (typeof cleanup === 'function') {
      runtime.cleanup = cleanup as Cleanup;
    }

    setStatus('ready', 'Ready');
  } catch (error) {
    showError(error);
    setStatus('error', 'Error');
  } finally {
    runButton.disabled = false;
  }
}

async function resetRuntime(): Promise<void> {
  const cleanup = runtime.cleanup;
  runtime.cleanup = undefined;

  if (cleanup) {
    await cleanup();
  }

  const viewer = runtime.viewer;
  runtime.viewer = undefined;

  if (viewer) {
    await viewer.dispose();
  }

  previewRoot.replaceChildren();
}

async function executeUserCode(code: string, context: RuntimeContext): Promise<unknown> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...values: unknown[]) => Promise<unknown>;
  const fn = new AsyncFunction(
    'Cesium',
    'viewer',
    'adapter',
    'cesiumViewer',
    'container',
    'cgx',
    `${code}\n//# sourceURL=cgx-sandcastle-user-code.js`,
  );

  return fn(
    context.Cesium,
    context.viewer,
    context.adapter,
    context.cesiumViewer,
    context.container,
    context.cgx,
  );
}

function configurePreview(cesiumViewer: Cesium.Viewer): void {
  cesiumViewer.scene.globe.depthTestAgainstTerrain = true;
  cesiumViewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#111315');
  cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#242a28');
  if (cesiumViewer.scene.skyAtmosphere) {
    cesiumViewer.scene.skyAtmosphere.show = true;
  }
  cesiumViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.391, 39.907, 2000000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-60),
      roll: 0,
    },
  });
}

function setStatus(kind: 'idle' | 'running' | 'ready' | 'error', label: string): void {
  statusDot.className = `status-dot ${kind}`;
  statusText.textContent = label;
}

function showError(error: unknown): void {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
  errorPanel.textContent = message.trim();
  errorPanel.hidden = false;
}
