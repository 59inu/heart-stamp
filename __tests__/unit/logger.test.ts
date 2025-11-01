/**
 * Logger 유틸리티 테스트
 *
 * 목적: console.log 대신 logger를 사용하여
 *       프로덕션에서 로그가 출력되지 않는지 확인
 */

describe('Logger Utility', () => {
  let originalDev: boolean;

  beforeEach(() => {
    // 원래 __DEV__ 값 저장
    originalDev = global.__DEV__;

    // console spy 초기화
    jest.clearAllMocks();
  });

  afterEach(() => {
    // __DEV__ 값 복원
    global.__DEV__ = originalDev;
  });

  it('should log in development mode', () => {
    // Arrange
    global.__DEV__ = true;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Reimport logger with DEV=true
    jest.resetModules();
    const { logger } = require('../../src/utils/logger');

    // Act
    logger.log('Test message');

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith('Test message');

    consoleSpy.mockRestore();
  });

  it('should NOT log in production mode', () => {
    // Arrange
    global.__DEV__ = false;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Reimport logger with DEV=false
    jest.resetModules();
    const { logger } = require('../../src/utils/logger');

    // Act
    logger.log('Test message');

    // Assert
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should always log errors in development', () => {
    // Arrange
    global.__DEV__ = true;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.resetModules();
    const { logger } = require('../../src/utils/logger');

    // Act
    logger.error('Error message');

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error message');

    consoleErrorSpy.mockRestore();
  });

  it('should have all logger methods', () => {
    // Arrange
    jest.resetModules();
    const { logger } = require('../../src/utils/logger');

    // Assert
    expect(logger).toHaveProperty('log');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');

    expect(typeof logger.log).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
  });
});
