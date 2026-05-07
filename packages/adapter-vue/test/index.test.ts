import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { signal } from '@cgx/reactive';
import { fromRef, toRef } from '../src/bridge.js';

describe('adapter-vue signal bridges', () => {
  it('syncs a Cgx signal into a Vue ref', () => {
    const count = signal(1);
    const vueRef = toRef(count);

    expect(vueRef.value).toBe(1);
    count.set(2);
    expect(vueRef.value).toBe(2);
  });

  it('syncs a Vue ref into a Cgx signal and back', async () => {
    const vueRef = ref('a');
    const cgxSignal = fromRef(vueRef);

    expect(cgxSignal.get()).toBe('a');

    vueRef.value = 'b';
    await nextTick();
    expect(cgxSignal.get()).toBe('b');

    cgxSignal.set('c');
    expect(vueRef.value).toBe('c');
  });
});
