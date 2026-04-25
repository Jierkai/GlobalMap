# Architecture

Cgx uses a **four-layer architecture** to separate concerns:

```
L4 · Framework Adapters    @cgx/adapter-vue
L3 · Feature API           @cgx/layer · @cgx/feature · @cgx/sketch · @cgx/edit
L2 · Domain Kernel         @cgx/reactive · @cgx/core · @cgx/history
L1 · Cesium Adapter        @cgx/adapter-cesium (internal)
```

## Key Principles

1. **Composition over inheritance** - No base classes exported to users
2. **Types as documentation** - Zero `any` in public API
3. **Escape hatch** - Every wrapper exposes `.raw` / `.cesium` for direct access
4. **Framework agnostic** - Core has zero framework dependency

## Layer Rules

- **L1** is the only layer that imports `cesium` at runtime
- **L2** may only `import type` from cesium
- **L3** accesses L1 only through L2 abstractions
- **L4** wraps L3 for specific frameworks
