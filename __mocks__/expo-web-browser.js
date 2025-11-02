export const openBrowserAsync = jest.fn(() => Promise.resolve({ type: 'cancel' }));
export const dismissBrowser = jest.fn(() => Promise.resolve());
export const warmUpAsync = jest.fn(() => Promise.resolve());
export const coolDownAsync = jest.fn(() => Promise.resolve());
export const mayInitWithUrlAsync = jest.fn(() => Promise.resolve());

export const WebBrowserResultType = {
  CANCEL: 'cancel',
  DISMISS: 'dismiss',
  OPENED: 'opened',
  LOCKED: 'locked',
};
