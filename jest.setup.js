// Setup __DEV__ for tests
global.__DEV__ = true;

// Suppress console.error in tests (services log errors)
global.console = {
  ...console,
  error: jest.fn(),
};
