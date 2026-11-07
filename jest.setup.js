jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The offline pictogram library is a bundled asset; tests only need its module shape.
jest.mock('./src/data/pictoLibrary', () => ({ PICTO_INDEX: 0, PICTO_PACKS: [] }));
