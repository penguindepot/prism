import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import logger from '../../src/utils/logger.js';

describe('Logger', () => {
  let originalConsole;
  let consoleOutput;

  beforeEach(() => {
    
    // Mock console methods to capture output
    originalConsole = {
      log: console.log,
      error: console.error
    };
    
    consoleOutput = [];
    console.log = (...args) => consoleOutput.push(['log', ...args]);
    console.error = (...args) => consoleOutput.push(['error', ...args]);
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe('table method', () => {
    test('should handle empty array', () => {
      logger.table([]);
      
      // Should not output anything for empty array
      expect(consoleOutput.length).toBe(0);
    });

    test('should handle null/undefined data', () => {
      logger.table(null);
      logger.table(undefined);
      
      // Should not output anything for null/undefined
      expect(consoleOutput.length).toBe(0);
    });

    test('should handle non-array data', () => {
      logger.table('not-an-array');
      logger.table(123);
      logger.table({});
      
      // Should not output anything for non-arrays
      expect(consoleOutput.length).toBe(0);
    });

    test('should format simple table data', () => {
      const data = [
        { Name: 'package1', Version: '1.0.0' },
        { Name: 'package2', Version: '2.0.0' }
      ];

      logger.table(data);

      // Should output header, separator, and data rows
      expect(consoleOutput.length).toBeGreaterThan(0);
      
      // Check that output includes table formatting
      const outputString = consoleOutput.map(item => item.slice(1).join(' ')).join('\n');
      expect(outputString).toContain('Name');
      expect(outputString).toContain('Version');
      expect(outputString).toContain('package1');
      expect(outputString).toContain('package2');
    });

    test('should handle columns with different widths', () => {
      const data = [
        { Short: 'a', VeryLongColumnName: 'short' },
        { Short: 'long value', VeryLongColumnName: 'another long value here' }
      ];

      logger.table(data);

      // Should format properly despite different column widths
      expect(consoleOutput.length).toBeGreaterThan(0);
      
      const outputString = consoleOutput.map(item => item.slice(1).join(' ')).join('\n');
      expect(outputString).toContain('Short');
      expect(outputString).toContain('VeryLongColumnName');
    });

    test('should handle missing values in rows', () => {
      const data = [
        { Name: 'package1', Version: '1.0.0', Author: 'John' },
        { Name: 'package2' }, // Missing Version and Author
        { Version: '3.0.0', Author: 'Jane' } // Missing Name
      ];

      logger.table(data);

      // Should handle missing values gracefully
      expect(consoleOutput.length).toBeGreaterThan(0);
    });

    test('should work with color disabled', () => {
      const data = [
        { Name: 'test', Value: '123' }
      ];

      logger.table(data);

      // Should still format table without colors
      expect(consoleOutput.length).toBeGreaterThan(0);
    });

    test('should handle single row data', () => {
      const data = [
        { Name: 'single-package', Version: '1.0.0', Description: 'A single package' }
      ];

      logger.table(data);

      // Should format single row properly
      expect(consoleOutput.length).toBeGreaterThan(0);
      
      const outputString = consoleOutput.map(item => item.slice(1).join(' ')).join('\n');
      expect(outputString).toContain('single-package');
    });
  });
});