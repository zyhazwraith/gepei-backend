import { LocalStorageProvider } from './local-storage.provider.js';
import { StorageProvider } from './storage.provider.js';

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) {
    return provider;
  }

  // Phase 1: keep local behavior unchanged while introducing abstraction.
  provider = new LocalStorageProvider();
  return provider;
}
