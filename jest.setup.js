jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The offline pictogram library is a bundled asset; tests only need its module shape.
jest.mock('./src/data/pictoLibrary', () => ({ PICTO_INDEX: 0, PICTO_PACKS: [] }));

// The phone's secure storage (Keychain / Keystore): an in-memory stand-in for the tests.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 2,
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error('invalid key');
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => void store.delete(k)),
    __store: store,
  };
});
