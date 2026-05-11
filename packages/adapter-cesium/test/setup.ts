import { vi } from 'vitest';

const mockViewerDestroy = vi.fn();
const mockHandlerDestroy = vi.fn();
const primitiveStore = new Set<any>();
const entityStore = new Set<any>();
const dataSourceStore = new Set<any>();

vi.mock('cesium', () => {
  return {
    Viewer: class {
      scene = {
        pickPositionSupported: true,
        pickPosition: vi.fn((pos) => ({ x: pos.x, y: pos.y, z: 0 })),
        camera: {
          pickEllipsoid: vi.fn((pos) => ({ x: pos.x, y: pos.y, z: 0 }))
        },
        primitives: {
          add: vi.fn((primitive) => {
            primitiveStore.add(primitive);
            return primitive;
          }),
          remove: vi.fn((primitive) => primitiveStore.delete(primitive)),
          contains: vi.fn((primitive) => primitiveStore.has(primitive))
        },
        pick: vi.fn(() => ({ id: 'picked' })),
        drillPick: vi.fn(() => [{ id: 'picked1' }])
      };
      camera = {};
      clock = {};
      imageryLayers = {
        addImageryProvider: vi.fn((p) => p),
        remove: vi.fn(() => true)
      };
      dataSources = {
        add: vi.fn(async (source) => {
          dataSourceStore.add(source);
          return source;
        }),
        remove: vi.fn((source) => dataSourceStore.delete(source))
      };
      terrainProvider = {};
      entities = {
        add: vi.fn((opts) => {
          const entity = { ...opts, id: 'entity-id' };
          entityStore.add(entity);
          return entity;
        }),
        remove: vi.fn((entity) => entityStore.delete(entity))
      };
      destroy = mockViewerDestroy;
      isDestroyed = vi.fn(() => false);
      constructor(container: any, options: any) {}
    },
    ScreenSpaceEventHandler: class {
      setInputAction = vi.fn();
      removeInputAction = vi.fn();
      destroy = mockHandlerDestroy;
      constructor(canvas: any) {}
    },
    ScreenSpaceEventType: {
      LEFT_CLICK: 0,
      LEFT_DOUBLE_CLICK: 1,
      LEFT_DOWN: 2,
      LEFT_UP: 3,
      RIGHT_CLICK: 4,
      MOUSE_MOVE: 5
    },
    Cartesian2: class {
      x: number;
      y: number;
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      static clone = vi.fn((c: any) => ({ ...c }));
    },
    Cartesian3: class {
      x: number;
      y: number;
      z: number;
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      static fromDegrees = vi.fn((lng, lat, alt) => ({ x: lng, y: lat, z: alt }));
      static clone = vi.fn((c: any) => ({ ...c }));
    },
    Cartographic: {
      fromCartesian: vi.fn(c => {
        if (!c) return undefined;
        return { longitude: c.x * Math.PI / 180, latitude: c.y * Math.PI / 180, height: c.z };
      })
    },
    Math: {
      toDegrees: (rad: number) => rad * 180 / Math.PI,
      toRadians: (deg: number) => deg * Math.PI / 180
    },
    WebMercatorProjection: class {
      unproject(point: any) {
        const radius = 6378137;
        return {
          longitude: point.x / radius,
          latitude: Math.PI / 2 - 2 * Math.atan(Math.exp(-point.y / radius)),
          height: point.z
        };
      }
    },
    UrlTemplateImageryProvider: class { constructor(options: any) { Object.assign(this, options); } },
    WebMapServiceImageryProvider: class { constructor(options: any) { Object.assign(this, options); } },
    CesiumTerrainProvider: {
      fromUrl: vi.fn(async (url, options) => ({ url, ...options }))
    },
    Cesium3DTileset: {
      fromUrl: vi.fn(async (url, options) => ({ url, ...options, id: 'tileset' }))
    },
    GeoJsonDataSource: {
      load: vi.fn(async (data, options) => ({ data, options, id: 'geojson' }))
    },
    Primitive: class {
      private _destroyed = false;
      id: string;
      constructor(options: any = {}) {
        Object.assign(this, options);
      }
      destroy = vi.fn(() => {
        this._destroyed = true;
        return undefined;
      });
      isDestroyed = vi.fn(() => this._destroyed);
    },
    Entity: class {
      id: string;
      constructor(options: any = {}) {
        Object.assign(this, options);
      }
    },
    Material: class { constructor(options: any) { Object.assign(this, options); } },
  };
});
