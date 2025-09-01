import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import { join } from 'path';
import install from '../../src/commands/install.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('Install Command', () => {
  let testDir;
  let originalExit;
  let exitCode;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('install-test');
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
      await expect(install()).rejects.toThrow('Process exit with code 1');
      expect(exitCode).toBe(1);
    });

    test('should handle invalid package specifications', async () => {
      await expect(install('invalid-package-spec')).rejects.toThrow();
    });
  });

  describe('dry run mode', () => {
    test('should handle dry run option', async () => {
      const options = { dryRun: true };
      
      // This should start the installation process but not make changes
      await expect(install('nonexistent-package', options)).rejects.toThrow();
    });
  });

  describe('package installation', () => {
    test('should attempt to install local package', async () => {
      // Create a mock local package
      const packageDir = join(testDir, 'test-package');
      await TestUtils.createTestPackage(packageDir, {
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package'
      });

      // Should successfully install the local package
      await expect(install('./test-package')).resolves.not.toThrow();
    });

    test('should attempt to install from GitHub URL', async () => {
      const githubUrl = 'https://github.com/test/repo.git';
      
      // This will fail but should test the GitHub URL parsing
      await expect(install(githubUrl)).rejects.toThrow();
    });

    test('should handle package spec parsing', async () => {
      // Test different package spec formats
      await expect(install('github:user/repo')).rejects.toThrow();
    });
  });
});