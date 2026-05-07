import { getCurrentInstance, ref, watch, onUnmounted, type Ref } from 'vue';
import { signal as createSignal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';

function onCurrentInstanceUnmounted(cleanup: () => void): void {
  if (getCurrentInstance()) {
    onUnmounted(cleanup);
  }
}

export function toRef<T>(s: Signal<T> | ReadonlySignal<T>): Ref<T> {
  const r = ref(s.get()) as Ref<T>;
  const off: Off = s.subscribe((v: T) => {
    r.value = v;
  });

  onCurrentInstanceUnmounted(() => off());

  return r;
}

export function fromRef<T>(r: Ref<T>): Signal<T> {
  const s = createSignal(r.value);

  const stopWatch = watch(r, (newVal) => {
    s.set(newVal);
  });

  const off = s.subscribe((v) => {
    r.value = v;
  });

  onCurrentInstanceUnmounted(() => {
    stopWatch();
    off();
  });

  return s;
}
