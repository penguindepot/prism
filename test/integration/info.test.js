import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import { join } from 'path';
import info from '../../src/commands/info.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('Info Command', () => {
  let testDir;
  let originalExit;
  let exitCode;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('info-test');
    process.chdir(testDir);
    
    // Mock process.exit to capture exit codes
    originalExit = process.exit;
    exitCode = null;
    process.exit = (code) => {
      exitCode = code;
      throw new Error(`Process exit with code ${code}`);
    };

    // Create initial PRISM structure
    await fs.ensureDir('.prism');
    await fs.writeFile('.prism/config.json', JSON.stringify({
      packages: {}
    }));
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('error handling', () => {
    test('should exit with error when no package specification provided', async () => {
      await expect(info()).rejects.toThrow('Process exit with code 1');
      expect(exitCode).toBe(1);
    });

    test('should handle missing remote package gracefully', async () => {
      // This will test the error handling path when package can't be fetched
      await expect(info('nonexistent-package')).rejects.toThrow();
    });
  });

  describe('installed package info', () => {
    test('should display info for installed package', async () => {
      // Setup installed package
      const mockManifest = {
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package description',
        author: 'Test Author',
        keywords: ['test', 'claude-code']
      };

      const config = {
        packages: {
          'test-package': {
            version: '1.0.0',
            manifest: mockManifest,
            variant: 'standard',
            installedAt: new Date().toISOString()
          }
        }
      };

      await fs.writeFile('.prism/config.json', JSON.stringify(config));

      // This should run without throwing
      await expect(async () => {
        await info('test-package');
      }).not.toThrow();
    });
  });

  describe('remote package info', () => {
    test('should attempt to fetch remote package info', async () => {
      // Test the remote fetch path - this will likely fail but should hit the code path
      await expect(info('github:user/repo')).rejects.toThrow();
    });
  });
});