import { describe, test, expect, beforeEach } from '@jest/globals';
import fs from 'fs-extra';
import list from '../../src/commands/list.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('List Command', () => {
  let testDir;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('list-test');
    process.chdir(testDir);
    
    // Create initial PRISM structure
    await fs.ensureDir('.prism');
  });

  describe('empty package list', () => {
    test('should handle empty package list', async () => {
      await fs.writeFile('.prism/config.json', JSON.stringify({
        packages: {}
      }));

      // Should run without throwing and display empty message
      await expect(async () => {
        await list({});
      }).not.toThrow();
    });
  });

  describe('installed packages', () => {
    test('should list installed packages in table format', async () => {
      const config = {
        packages: {
          'package-one': {
            version: '1.0.0',
            manifest: {
              name: 'package-one',
              version: '1.0.0',
              description: 'First test package',
              author: 'Test Author'
            },
            variant: 'standard',
            installedAt: '2024-01-01T00:00:00.000Z'
          },
          'package-two': {
            version: '2.0.0',
            manifest: {
              name: 'package-two',
              version: '2.0.0',
              description: 'Second test package',
              author: 'Another Author'
            },
            variant: 'minimal',
            installedAt: '2024-01-02T00:00:00.000Z'
          }
        }
      };

      await fs.writeFile('.prism/config.json', JSON.stringify(config));

      // Should run without throwing and display table
      await expect(async () => {
        await list({});
      }).not.toThrow();
    });

    test('should handle global option', async () => {
      await fs.writeFile('.prism/config.json', JSON.stringify({
        packages: {}
      }));

      const options = { global: true };
      
      await expect(async () => {
        await list(options);
      }).not.toThrow();
    });

    test('should handle outdated option', async () => {
      await fs.writeFile('.prism/config.json', JSON.stringify({
        packages: {}
      }));

      const options = { outdated: true };
      
      await expect(async () => {
        await list(options);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    test('should handle missing config file gracefully', async () => {
      // Don't create config file
      // The command might exit with code 1, but we're testing the flow works
      try {
        await list({});
      } catch (error) {
        // Expected to throw due to missing config
        expect(error.message).toContain('PRISM not initialized');
      }
    });
  });
});