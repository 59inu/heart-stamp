// Mock for react-native-get-random-values
// In test environment, use Node's crypto for randomness
const crypto = require('crypto');

if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array) => {
      return crypto.randomFillSync(array);
    },
  };
}

module.exports = {};
