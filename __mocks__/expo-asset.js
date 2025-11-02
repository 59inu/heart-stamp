export class Asset {
  constructor(options) {
    this.uri = options.uri || '';
    this.name = options.name || '';
  }

  async downloadAsync() {
    return this;
  }
}

export const fromModule = jest.fn((module) => new Asset({ uri: 'mock://asset' }));
