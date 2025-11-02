export const requestForegroundPermissionsAsync = jest.fn();
export const getCurrentPositionAsync = jest.fn();
export const watchPositionAsync = jest.fn();

export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

export const PermissionStatus = {
  UNDETERMINED: 'undetermined',
  DENIED: 'denied',
  GRANTED: 'granted',
};
