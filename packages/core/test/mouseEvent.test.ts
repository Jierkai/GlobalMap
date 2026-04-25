// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as Cesium from "cesium";
import { ScreenInteractor } from '../src/util/mouseEvent';

describe('ScreenInteractor', () => {
  it('should initialize and register events without throwing', () => {
    // Mock canvas and scene
    const canvas = document.createElement('canvas');
    const mockScene = {
      canvas,
      pickPosition: vi.fn().mockReturnValue(new Cesium.Cartesian3(1, 1, 1))
    } as unknown as Cesium.Scene;

    const interactor = new ScreenInteractor(mockScene);
    
    // Check if methods exist and execute cleanly
    expect(() => {
      interactor.registerLeftClick(vi.fn());
      interactor.registerLeftDoubleClick(vi.fn());
      interactor.registerRightClick(vi.fn());
      interactor.registerPointerMove(vi.fn());
    }).not.toThrow();

    interactor.dispose();
  });
});
