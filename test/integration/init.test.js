import { describe, test, expect, beforeEach } from '@jest/globals';
import { join } from 'path';
import fs from 'fs-extra';
import init from '../../src/commands/init.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('Init Command Integration', () => {
  let testDir;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('init-integration');
    // Change to test directory for command execution
    process.chdir(testDir);
  });

  describe('init command', () => {
    test('should initialize PRISM project structure', async () => {
      await init({});

      // Check that PRISM structure was created
      expect(await TestUtils.verifyPrismStructure(testDir)).toBe(true);

      // Check specific directories
      expect(await fs.pathExists(join(testDir, '.prism'))).toBe(true);
      expect(await fs.pathExists(join(testDir, '.prism', 'config.json'))).toBe(true);
      expect(await fs.pathExists(join(testDir, '.claude'))).toBe(true);
      expect(await fs.pathExists(join(testDir, '.claude', 'commands'))).toBe(true);
      expect(await fs.pathExists(join(testDir, '.claude', 'scripts'))).toBe(true);
    });

    test('should create valid configuration file', async () => {
      await init({});

      const configPath = join(testDir, '.prism', 'config.json');
      const config = await fs.readJson(configPath);

      // Verify config structure
      expect(config.version).toBe('1.0.0');
      expect(config.registry).toBeDefined();
      expect(config.packages).toEqual({});
      expect(config.config).toBeDefined();
      expect(config.config.defaultVariant).toBe('standard');
      expect(config.config.autoUpdate).toBe(false);
      expect(config.config.verbose).toBe(false);
      expect(config.config.confirmUninstall).toBe(true);
      expect(config.config.keepBackups).toBe(true);
    });

    test('should handle re-initialization without force flag', async () => {
      // Initialize first time
      await init({});

      // Try to initialize again without force
      await expect(init({})).rejects.toThrow();

      // Config should still exist and be unchanged
      const configPath = join(testDir, '.prism', 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    test('should allow re-initialization with force flag', async () => {
      // Initialize first time
      await init({});

      // Modify config to verify it gets reset
      const configPath = join(testDir, '.prism', 'config.json');
      const config = await fs.readJson(configPath);
      config.customField = 'test';
      await fs.writeJson(configPath, config);

      // Re-initialize with force
      await init({ force: true });

      // Config should be reset to defaults
      const newConfig = await fs.readJson(configPath);
      expect(newConfig.customField).toBeUndefined();
      expect(newConfig.version).toBe('1.0.0');
    });

    test('should preserve existing packages when force re-initializing', async () => {
      // Initialize first time
      await init({});

      // Add a package to config
      const configPath = join(testDir, '.prism', 'config.json');
      const config = await fs.readJson(configPath);
      config.packages['test-package'] = {
        version: '1.0.0',
        variant: 'standard'
      };
      await fs.writeJson(configPath, config);

      // Re-initialize with force
      await init({ force: true });

      // Packages should be preserved
      const newConfig = await fs.readJson(configPath);
      expect(newConfig.packages['test-package']).toBeDefined();
      expect(newConfig.packages['test-package'].version).toBe('1.0.0');
    });

    test('should create directory structure even if some directories exist', async () => {
      // Pre-create some directories
      await fs.ensureDir(join(testDir, '.claude'));
      await fs.writeFile(join(testDir, '.claude', 'existing-file.txt'), 'existing content');

      await init({});

      // Should still create complete structure
      expect(await TestUtils.verifyPrismStructure(testDir)).toBe(true);
      
      // Existing files should be preserved
      expect(await fs.pathExists(join(testDir, '.claude', 'existing-file.txt'))).toBe(true);
      const content = await fs.readFile(join(testDir, '.claude', 'existing-file.txt'), 'utf8');
      expect(content).toBe('existing content');
    });

    test('should handle permissions errors gracefully', async () => {
      // Create a read-only directory (simulate permissions issue)
      await fs.ensureDir(join(testDir, 'readonly'));
      
      // Change to readonly directory
      const readonlyDir = join(testDir, 'readonly');
      const originalCwd = process.cwd();
      
      // Make directory read-only (on systems that support it)
      try {
        await fs.chmod(readonlyDir, 0o444);
        
        process.chdir(readonlyDir);
        
        // Should handle permission error gracefully
        await expect(init({})).rejects.toThrow();
      } catch (error) {
        // Skip this test on systems where chmod doesn't work as expected
        if (error.code !== 'EPERM' && error.code !== 'EACCES') {
          throw error;
        }
      } finally {
        // Restore working directory first
        try {
          process.chdir(originalCwd);
        } catch (e) {
          // Ignore directory change errors
        }
        // Restore permissions for cleanup
        try {
          await fs.chmod(readonlyDir, 0o755);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    test('should work in nested directory', async () => {
      // Create and change to nested directory
      const nestedDir = join(testDir, 'project', 'subdir');
      await fs.ensureDir(nestedDir);
      process.chdir(nestedDir);

      await init({});

      // Should create PRISM structure in the nested directory
      expect(await fs.pathExists(join(nestedDir, '.prism'))).toBe(true);
      expect(await fs.pathExists(join(nestedDir, '.claude'))).toBe(true);
    });

    test('should handle existing git repository', async () => {
      // Initialize a git repository
      await fs.ensureDir(join(testDir, '.git'));
      await fs.writeFile(join(testDir, '.git', 'config'), '[core]\n\tbare = false');

      await init({});

      // Should still initialize PRISM structure
      expect(await TestUtils.verifyPrismStructure(testDir)).toBe(true);
      
      // Git directory should be preserved
      expect(await fs.pathExists(join(testDir, '.git'))).toBe(true);
    });

    test('should set correct registry URL from environment', async () => {
      // Set custom registry
      const originalRegistry = process.env.PRISM_REGISTRY;
      process.env.PRISM_REGISTRY = 'https://custom.registry.com';

      try {
        await init({});

        const configPath = join(testDir, '.prism', 'config.json');
        const config = await fs.readJson(configPath);

        expect(config.registry).toBe('https://custom.registry.com');
      } finally {
        // Restore original environment
        if (originalRegistry) {
          process.env.PRISM_REGISTRY = originalRegistry;
        } else {
          delete process.env.PRISM_REGISTRY;
        }
      }
    });
  });
});