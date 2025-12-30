import { get, set, del, keys, clear } from 'idb-keyval';

/**
 * Storage utility using IndexedDB via idb-keyval
 * Provides asynchronous storage for large objects (images) without blocking the UI
 */

const PREFIX = 'stencilflow_';

export const storage = {
  /**
   * Set a value in storage
   * @param key Key name (will be unified with prefix)
   * @param value Value to store
   */
  async set(key: string, value: any): Promise<void> {
    try {
      await set(`${PREFIX}${key}`, value);
    } catch (error) {
      console.error('Storage set error:', error);
      // Fallback to sessionStorage if IDB fails (rare)
      try {
        sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
      } catch (e) {
        console.error('SessionStorage fallback failed:', e);
      }
    }
  },

  /**
   * Get a value from storage
   * @param key Key name
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await get(`${PREFIX}${key}`);
      return value as T;
    } catch (error) {
      console.error('Storage get error:', error);
      // Fallback to sessionStorage
      try {
        const item = sessionStorage.getItem(`${PREFIX}${key}`);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        return null;
      }
    }
  },

  /**
   * Remove a value from storage
   * @param key Key name
   */
  async remove(key: string): Promise<void> {
    try {
      await del(`${PREFIX}${key}`);
      // Also clean fallback
      sessionStorage.removeItem(`${PREFIX}${key}`);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  /**
   * Clear all app associated keys
   */
  async clearAll(): Promise<void> {
    try {
      // Get all keys
      const allKeys = await keys();
      // Filter our keys
      const appKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(PREFIX));
      // Delete them
      await Promise.all(appKeys.map(k => del(k)));
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
};
