module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-navigation|@expo|expo|date-fns|uuid|react-native-get-random-values)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/models/**',
    '!src/constants/**',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    'expo-image-picker': '<rootDir>/__mocks__/expo-image-picker.js',
    'expo-file-system': '<rootDir>/__mocks__/expo-file-system.js',
    'expo-asset': '<rootDir>/__mocks__/expo-asset.js',
    'expo-location': '<rootDir>/__mocks__/expo-location.js',
    'expo-web-browser': '<rootDir>/__mocks__/expo-web-browser.js',
    'react-native-get-random-values': '<rootDir>/__mocks__/react-native-get-random-values.js',
  },
};
