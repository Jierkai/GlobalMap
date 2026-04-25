import { vi } from 'vitest';

const mockViewerDestroy = vi.fn();
const mockHandlerDestroy = vi.fn();

vi.mock('cesium', () => {
  return {
    Viewer: class {
      scene = {
        pickPositionSupported: true,
        pickPosition: vi.fn((pos) => ({ x: pos.x, y: pos.y, z: 0 })),
        camera: {
          pickEllipsoid: vi.fn((pos) => ({ x: pos.x, y: pos.y, z: 0 }))
        }
      };
      camera = {};
      clock = {};
      imageryLayers = {};
      terrainProvider = {};
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
    Cartesian3: {
      fromDegrees: vi.fn((lng, lat, alt) => ({ x: lng, y: lat, z: alt })),
      clone: vi.fn(c => ({...c}))
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
    }
  };
});