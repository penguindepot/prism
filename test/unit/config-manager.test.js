import { describe, test, expect, beforeEach } from '@jest/globals';
import { join } from 'path';
import fs from 'fs-extra';
import ConfigManager from '../../src/utils/config.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('ConfigManager', () => {
  let testDir;
  let configManager;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('config-manager');
    configManager = new ConfigManager(testDir);
  });

  describe('ensureConfig', () => {
    test('should create default config when none exists', async () => {
      await configManager.ensureConfig();

      const configPath = join(testDir, '.prism', 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.version).toBe('1.0.0');
      expect(config.packages).toEqual({});
      expect(config.config.defaultVariant).toBe('standard');
    });

    test('should not overwrite existing config', async () => {
      // Create existing config
      const existingConfig = {
        version: '1.0.0',
        packages: { 'test-package': { version: '1.0.0' } },
        config: { customSetting: true }
      };

      await fs.ensureDir(join(testDir, '.prism'));
      await fs.writeJson(join(testDir, '.prism', 'config.json'), existingConfig);

      await configManager.ensureConfig();

      const config = await configManager.getConfig();
      expect(config.packages['test-package']).toBeDefined();
      expect(config.config.customSetting).toBe(true);
    });

    test('should create .prism directory if it does not exist', async () => {
      const prismDir = join(testDir, '.prism');
      expect(await fs.pathExists(prismDir)).toBe(false);

      await configManager.ensureConfig();

      expect(await fs.pathExists(prismDir)).toBe(true);
    });
  });

  describe('getConfig', () => {
    test('should return current configuration', async () => {
      await configManager.ensureConfig();
      
      const config = await configManager.getConfig();
      
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('registry');
      expect(config).toHaveProperty('packages');
      expect(config).toHaveProperty('config');
    });

    test('should handle missing config file gracefully', async () => {
      // Don't call ensureConfig first
      const config = await configManager.getConfig();
      
      // Should create default config
      expect(config.version).toBe('1.0.0');
      expect(config.packages).toEqual({});
    });
  });

  describe('updateConfig', () => {
    test('should update configuration values', async () => {
      await configManager.ensureConfig();

      const updates = {
        config: {
          verbose: true,
          customSetting: 'test-value'
        }
      };

      const updatedConfig = await configManager.updateConfig(updates);

      expect(updatedConfig.config.verbose).toBe(true);
      expect(updatedConfig.config.customSetting).toBe('test-value');
      
      // Verify it was persisted
      const reloadedConfig = await configManager.getConfig();
      expect(reloadedConfig.config.verbose).toBe(true);
      expect(reloadedConfig.config.customSetting).toBe('test-value');
    });

    test('should merge with existing configuration', async () => {
      await configManager.ensureConfig();

      // First update
      await configManager.updateConfig({
        config: { setting1: 'value1' }
      });

      // Second update
      await configManager.updateConfig({
        config: { setting2: 'value2' }
      });

      const config = await configManager.getConfig();
      expect(config.config.setting1).toBe('value1');
      expect(config.config.setting2).toBe('value2');
      // Should preserve default settings
      expect(config.config.defaultVariant).toBe('standard');
    });
  });

  describe('addPackage', () => {
    test('should add package to configuration', async () => {
      await configManager.ensureConfig();

      const packageInfo = {
        name: 'test-package',
        version: '1.0.0',
        variant: 'minimal',
        source: 'github:user/repo',
        installedAt: new Date().toISOString()
      };

      await configManager.addPackage(packageInfo);

      const config = await configManager.getConfig();
      const pkg = config.packages['test-package'];
      
      expect(pkg).toBeDefined();
      expect(pkg.version).toBe('1.0.0');
      expect(pkg.variant).toBe('minimal');
      expect(pkg.source).toBe('github:user/repo');
      expect(pkg.installedAt).toBeDefined();
    });

    test('should update existing package', async () => {
      await configManager.ensureConfig();

      // Add initial package
      await configManager.addPackage({
        name: 'test-package',
        version: '1.0.0',
        variant: 'minimal'
      });

      // Update the same package
      await configManager.addPackage({
        name: 'test-package',
        version: '2.0.0',
        variant: 'full'
      });

      const config = await configManager.getConfig();
      const pkg = config.packages['test-package'];
      
      expect(pkg.version).toBe('2.0.0');
      expect(pkg.variant).toBe('full');
    });
  });

  describe('removePackage', () => {
    test('should remove package from configuration', async () => {
      await configManager.ensureConfig();

      // Add a package first
      await configManager.addPackage({
        name: 'test-package',
        version: '1.0.0'
      });

      let config = await configManager.getConfig();
      expect(config.packages['test-package']).toBeDefined();

      // Remove the package
      await configManager.removePackage('test-package');

      config = await configManager.getConfig();
      expect(config.packages['test-package']).toBeUndefined();
    });

    test('should handle removing non-existent package gracefully', async () => {
      await configManager.ensureConfig();

      // Should not throw error
      await expect(configManager.removePackage('non-existent')).resolves.not.toThrow();
    });
  });

  describe('listPackages', () => {
    test('should return list of installed packages', async () => {
      await configManager.ensureConfig();

      // Add some packages
      await configManager.addPackage({
        name: 'package1',
        version: '1.0.0',
        variant: 'minimal'
      });

      await configManager.addPackage({
        name: 'package2',
        version: '2.0.0',
        variant: 'full'
      });

      const packages = await configManager.listPackages();

      expect(packages).toHaveLength(2);
      expect(packages.find(p => p.name === 'package1')).toBeDefined();
      expect(packages.find(p => p.name === 'package2')).toBeDefined();
    });

    test('should return empty array when no packages installed', async () => {
      await configManager.ensureConfig();

      const packages = await configManager.listPackages();
      expect(packages).toEqual([]);
    });

    test('should include package names as property', async () => {
      await configManager.ensureConfig();

      await configManager.addPackage({
        name: 'test-package',
        version: '1.0.0'
      });

      const packages = await configManager.listPackages();
      
      expect(packages[0].name).toBe('test-package');
      expect(packages[0].version).toBe('1.0.0');
    });
  });

  describe('getPackage', () => {
    test('should return specific package information', async () => {
      await configManager.ensureConfig();

      const packageInfo = {
        name: 'test-package',
        version: '1.0.0',
        variant: 'standard',
        source: 'github:user/repo'
      };

      await configManager.addPackage(packageInfo);

      const pkg = await configManager.getPackage('test-package');

      expect(pkg.name).toBe('test-package');
      expect(pkg.version).toBe('1.0.0');
      expect(pkg.variant).toBe('standard');
      expect(pkg.source).toBe('github:user/repo');
    });

    test('should return null for non-existent package', async () => {
      await configManager.ensureConfig();

      const pkg = await configManager.getPackage('non-existent');
      expect(pkg).toBeNull();
    });
  });

  describe('global configuration', () => {
    test('should handle global configuration separately', async () => {
      const globalConfig = await configManager.getGlobalConfig();
      
      expect(globalConfig).toHaveProperty('preferences');
      expect(globalConfig.preferences).toHaveProperty('registry');
      expect(globalConfig.preferences).toHaveProperty('variant');
    });

    test('should update global configuration', async () => {
      const updates = {
        preferences: {
          registry: 'https://custom-registry.example.com',
          verbose: true
        }
      };

      const updatedConfig = await configManager.updateGlobalConfig(updates);

      expect(updatedConfig.preferences.registry).toBe('https://custom-registry.example.com');
      expect(updatedConfig.preferences.verbose).toBe(true);
    });

    test('should create global config directory if it does not exist', async () => {
      // The global config should be created in a temporary location for testing
      const globalConfig = await configManager.getGlobalConfig();
      expect(globalConfig).toBeDefined();
    });
  });
});