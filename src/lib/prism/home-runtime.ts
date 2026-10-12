import type { HomeStore } from './home-store';

type StoreListener = (store: HomeStore | null) => void;

let activeStore: HomeStore | null = null;
const listeners = new Set<StoreListener>();

export function getActiveHomeStore(): HomeStore | null {
  return activeStore;
}

export function setActiveHomeStore(store: HomeStore | null): void {
  if (activeStore === store) return;
  activeStore = store;
  for (const listener of listeners) listener(activeStore);
}

export function subscribeActiveHomeStore(listener: StoreListener): () => void {
  listeners.add(listener);
  listener(activeStore);
  return () => listeners.delete(listener);
}
