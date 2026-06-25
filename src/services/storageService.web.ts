import { configureAsyncStorageKey, initAsyncStorage } from '@/src/services/storageService.asyncBackend';

configureAsyncStorageKey('@grocery_financial_web_data_v1');

export type StorageMode = 'sqlite' | 'async' | 'pending';
export const storageMode: StorageMode = 'async';

export async function initStorage(): Promise<void> {
  await initAsyncStorage();
}

export * from '@/src/services/storageService.asyncBackend';
