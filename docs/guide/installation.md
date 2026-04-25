# Installation

## Package Manager

```bash
# pnpm (recommended)
pnpm add @cgx/core @cgx/reactive

# npm
npm install @cgx/core @cgx/reactive

# yarn
yarn add @cgx/core @cgx/reactive
```

## Peer Dependencies

Cgx requires CesiumJS as a peer dependency:

```bash
pnpm add cesium@^1.139
```

## Package Overview

| Package | Layer | Description |
|---------|-------|-------------|
| `@cgx/reactive` | L2 | Signal reactive primitives |
| `@cgx/adapter-cesium` | L1 | Cesium adapter (internal) |
| `@cgx/core` | L2+L3 | Viewer, events, errors, FSM, constraints |
| `@cgx/layer` | L3 | Imagery, terrain, vector, 3DTiles layers |
| `@cgx/feature` | L3 | Point, polyline, polygon, model features |
| `@cgx/sketch` | L3 | Drawing tools (6 sketchers) |
| `@cgx/edit` | L3 | Feature editing (vertex drag, batch transform) |
| `@cgx/history` | L2 | Command pattern undo/redo |
| `@cgx/analysis` | L3 | Spatial analysis (buffer, profile, viewshed) |
| `@cgx/ui` | L3 | Popup, tooltip, context menu |
| `@cgx/material` | L3 | Custom materials |
| `@cgx/adapter-vue` | L4 | Vue 3 adapter |
| `@cgx/provider-cn` | L3 | Chinese map providers (Baidu, GCJ) |
