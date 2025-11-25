/**
 * Manual mock for expo-secure-store
 * Prevents Jest from trying to import native modules
 */

const mockStore = new Map();

module.exports = {
  getItemAsync: jest.fn(async (key) => mockStore.get(key) || null),
  setItemAsync: jest.fn(async (key, value) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    mockStore.delete(key);
  }),
};
