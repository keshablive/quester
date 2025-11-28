/**
 * Storage Utilities
 * 
 * Provides a type-safe wrapper around AsyncStorage with
 * error handling, JSON serialization, and prefix support.
 * 
 * @example
 * ```tsx
 * import { setItem, getItem, removeItem } from '@/core';
 * 
 * await setItem('user', { id: 1, name: 'John' });
 * const user = await getItem<User>('user');
 * await removeItem('user');
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './error';

/**
 * Storage key prefix for namespacing
 */
const STORAGE_PREFIX = '@quester:';

/**
 * Get full storage key with prefix
 * 
 * @param key - Storage key
 * @returns Prefixed key
 */
function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * Store a value in AsyncStorage
 * 
 * Automatically serializes objects to JSON.
 * 
 * @param key - Storage key
 * @param value - Value to store (will be JSON serialized)
 * @throws Error if storage operation fails
 * 
 * @example
 * ```tsx
 * await setItem('theme', 'dark');
 * await setItem('user', { id: 1, name: 'John' });
 * await setItem('settings', { notifications: true });
 * ```
 */
export async function setItem<T = any>(key: string, value: T): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(getKey(key), jsonValue);
  } catch (error) {
    logError(error, { operation: 'setItem', key });
    throw new Error(`Failed to save ${key} to storage`);
  }
}

/**
 * Retrieve a value from AsyncStorage
 * 
 * Automatically deserializes JSON to objects.
 * 
 * @param key - Storage key
 * @returns Stored value or null if not found
 * 
 * @example
 * ```tsx
 * const theme = await getItem<string>('theme');
 * const user = await getItem<User>('user');
 * const settings = await getItem<Settings>('settings');
 * ```
 */
export async function getItem<T = any>(key: string): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(getKey(key));
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    logError(error, { operation: 'getItem', key });
    return null;
  }
}

/**
 * Remove a value from AsyncStorage
 * 
 * @param key - Storage key
 * 
 * @example
 * ```tsx
 * await removeItem('user');
 * await removeItem('token');
 * ```
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getKey(key));
  } catch (error) {
    logError(error, { operation: 'removeItem', key });
    throw new Error(`Failed to remove ${key} from storage`);
  }
}

/**
 * Clear all values from AsyncStorage
 * 
 * Only clears values with the app prefix.
 * 
 * @example
 * ```tsx
 * await clear(); // Removes all app data
 * ```
 */
export async function clear(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
    await AsyncStorage.multiRemove(appKeys);
  } catch (error) {
    logError(error, { operation: 'clear' });
    throw new Error('Failed to clear storage');
  }
}

/**
 * Get all storage keys for the app
 * 
 * @returns Array of keys (without prefix)
 * 
 * @example
 * ```tsx
 * const keys = await getAllKeys();
 * console.log(keys); // ['user', 'theme', 'settings']
 * ```
 */
export async function getAllKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .map(key => key.replace(STORAGE_PREFIX, ''));
  } catch (error) {
    logError(error, { operation: 'getAllKeys' });
    return [];
  }
}

/**
 * Check if a key exists in storage
 * 
 * @param key - Storage key
 * @returns True if key exists
 * 
 * @example
 * ```tsx
 * if (await hasItem('user')) {
 *   console.log('User is logged in');
 * }
 * ```
 */
export async function hasItem(key: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(getKey(key));
    return value !== null;
  } catch (error) {
    logError(error, { operation: 'hasItem', key });
    return false;
  }
}

/**
 * Get multiple values from storage
 * 
 * @param keys - Array of storage keys
 * @returns Object with key-value pairs
 * 
 * @example
 * ```tsx
 * const data = await getMultiple(['user', 'theme', 'settings']);
 * console.log(data); // { user: {...}, theme: 'dark', settings: {...} }
 * ```
 */
export async function getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
  try {
    const prefixedKeys = keys.map(getKey);
    const pairs = await AsyncStorage.multiGet(prefixedKeys);
    
    return pairs.reduce((acc, [key, value]) => {
      const originalKey = key.replace(STORAGE_PREFIX, '');
      acc[originalKey] = value != null ? JSON.parse(value) : null;
      return acc;
    }, {} as Record<string, T | null>);
  } catch (error) {
    logError(error, { operation: 'getMultiple', keys });
    return keys.reduce((acc, key) => {
      acc[key] = null;
      return acc;
    }, {} as Record<string, T | null>);
  }
}

/**
 * Set multiple values in storage
 * 
 * @param data - Object with key-value pairs to store
 * 
 * @example
 * ```tsx
 * await setMultiple({
 *   theme: 'dark',
 *   language: 'en',
 *   notifications: true
 * });
 * ```
 */
export async function setMultiple(data: Record<string, any>): Promise<void> {
  try {
    const pairs: [string, string][] = Object.entries(data).map(([key, value]) => [
      getKey(key),
      JSON.stringify(value),
    ]);
    await AsyncStorage.multiSet(pairs);
  } catch (error) {
    logError(error, { operation: 'setMultiple', keys: Object.keys(data) });
    throw new Error('Failed to save multiple items to storage');
  }
}

/**
 * Remove multiple values from storage
 * 
 * @param keys - Array of storage keys to remove
 * 
 * @example
 * ```tsx
 * await removeMultiple(['user', 'token', 'refreshToken']);
 * ```
 */
export async function removeMultiple(keys: string[]): Promise<void> {
  try {
    const prefixedKeys = keys.map(getKey);
    await AsyncStorage.multiRemove(prefixedKeys);
  } catch (error) {
    logError(error, { operation: 'removeMultiple', keys });
    throw new Error('Failed to remove multiple items from storage');
  }
}

/**
 * Storage keys used in the application
 * 
 * Centralize storage keys to avoid typos and improve maintainability.
 */
export const StorageKeys = {
  // Auth
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  
  // Settings
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  
  // App State
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LAST_SYNC: 'last_sync',
  
  // Cache
  CACHED_DATA: 'cached_data',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
