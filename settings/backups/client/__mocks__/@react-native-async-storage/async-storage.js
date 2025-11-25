/**
 * Mock for @react-native-async-storage/async-storage
 * Used in Jest tests
 */

// Simple in-memory AsyncStorage mock that remembers values across calls during a test
const _store = Object.create(null);

const AsyncStorage = {
  setItem: jest.fn((key, value) => {
    _store[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => Promise.resolve(Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null)),
  removeItem: jest.fn((key) => {
    if (Object.prototype.hasOwnProperty.call(_store, key)) delete _store[key];
    return Promise.resolve();
  }),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([k, v]) => { _store[k] = v; });
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys) => Promise.resolve(keys.map(k => [k, Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null]))),
  multiRemove: jest.fn((keys) => {
    keys.forEach(k => { if (Object.prototype.hasOwnProperty.call(_store, k)) delete _store[k]; });
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(_store))),
  clear: jest.fn(() => {
    Object.keys(_store).forEach(k => delete _store[k]);
    return Promise.resolve();
  }),
};

export default AsyncStorage;
