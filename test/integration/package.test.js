import { describe, test, expect, beforeEach } from '@jest/globals';
import { join } from 'path';
import fs from 'fs-extra';
import tar from 'tar';
import packageCmd from '../../src/commands/package.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('Package Command Integration', () => {
  let testDir;
  let packageDir;
  let outputDir;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('package-integration');
    packageDir = join(testDir, 'source-package');
    outputDir = join(testDir, 'output');
    
    await fs.ensureDir(packageDir);
    await fs.ensureDir(outputDir);
  });

  describe('package command', () => {
    test('should create package from directory', async () => {
      // Create a complete test package
      await TestUtils.createTestPackage(packageDir, {
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package for packaging',
        author: 'Test Author',
        license: 'MIT'
      }, {
        'commands/main.md': '# Main Command\nThis is the main command.',
        'commands/helper.md': '# Helper Command\nThis is a helper command.',
        'scripts/install.sh': '#!/bin/bash\necho "Installing package"',
        'README.md': '# Test Package\nThis is a test package for PRISM.',
        'templates/config.yaml': 'default:\n  setting: value'
      });

      const result = await packageCmd(packageDir, {});

      // Should create package file in same directory
      expect(await fs.pathExists(result)).toBe(true);

      // Verify package is not empty
      const stats = await fs.stat(result);
      expect(stats.size).toBeGreaterThan(500); // Should contain meaningful content
    });

    test('should respect custom output filename', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'custom-package',
        version: '2.0.0'
      }, {
        'commands/test.md': '# Test Command'
      });

      const customOutput = join(outputDir, 'custom-name.tar.gz');
      
      const result = await packageCmd(packageDir, { 
        output: customOutput 
      });

      expect(await fs.pathExists(customOutput)).toBe(true);
      const expectedPath = await fs.realpath(customOutput);
      expect(result).toBe(expectedPath);
    });

    test('should exclude ignored files', async () => {
      const manifest = `
name: exclude-test
version: 1.0.0
description: Testing file exclusion
author: Test Author
license: MIT

claudeCode:
  minVersion: "1.0.0"

structure:
  commands:
    - source: commands/
      dest: .claude/commands/{name}/

ignore:
  - node_modules
  - "*.log"
  - .env
  - temp/
`;

      await fs.writeFile(join(packageDir, 'prism-package.yaml'), manifest);
      
      // Create files that should be included
      await fs.ensureDir(join(packageDir, 'commands'));
      await fs.writeFile(join(packageDir, 'commands', 'include.md'), '# Include This');
      await fs.writeFile(join(packageDir, 'README.md'), '# Package README');
      
      // Create files that should be excluded
      await fs.ensureDir(join(packageDir, 'node_modules', 'some-package'));
      await fs.writeFile(join(packageDir, 'node_modules', 'some-package', 'index.js'), 'module.exports = {}');
      await fs.writeFile(join(packageDir, 'debug.log'), 'Debug log content');
      await fs.writeFile(join(packageDir, '.env'), 'SECRET=value');
      await fs.ensureDir(join(packageDir, 'temp'));
      await fs.writeFile(join(packageDir, 'temp', 'cache.tmp'), 'temp content');

      const packagePath = await packageCmd(packageDir, {});
      
      // Extract and verify contents
      const extractDir = join(testDir, 'extracted');
      await fs.ensureDir(extractDir);
      
      await tar.extract({
        file: packagePath,
        cwd: extractDir
      });

      // Check included files
      expect(await fs.pathExists(join(extractDir, 'prism-package.yaml'))).toBe(true);
      expect(await fs.pathExists(join(extractDir, 'commands', 'include.md'))).toBe(true);
      expect(await fs.pathExists(join(extractDir, 'README.md'))).toBe(true);
      
      // Check excluded files
      expect(await fs.pathExists(join(extractDir, 'node_modules'))).toBe(false);
      expect(await fs.pathExists(join(extractDir, 'debug.log'))).toBe(false);
      expect(await fs.pathExists(join(extractDir, '.env'))).toBe(false);
      expect(await fs.pathExists(join(extractDir, 'temp'))).toBe(false);
    });


    test('should exclude specific patterns with exclude option', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'exclude-test',
        version: '1.0.0'
      }, {
        'commands/keep.md': '# Keep This',
        'commands/remove.md': '# Remove This',
        'scripts/keep.sh': '#!/bin/bash\necho "keep"',
        'scripts/remove.sh': '#!/bin/bash\necho "remove"'
      });

      const result = await packageCmd(packageDir, {
        exclude: '**/*remove*'
      });

      expect(await fs.pathExists(result)).toBe(true);

      // Extract and verify excluded patterns were not included
      const extractDir = join(testDir, 'extracted-exclude');
      await fs.ensureDir(extractDir);
      
      await tar.extract({
        file: result,
        cwd: extractDir
      });

      expect(await fs.pathExists(join(extractDir, 'commands', 'keep.md'))).toBe(true);
      expect(await fs.pathExists(join(extractDir, 'scripts', 'keep.sh'))).toBe(true);
      expect(await fs.pathExists(join(extractDir, 'commands', 'remove.md'))).toBe(false);
      expect(await fs.pathExists(join(extractDir, 'scripts', 'remove.sh'))).toBe(false);
    });

    test('should handle empty directories', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'empty-dirs-test',
        version: '1.0.0'
      });

      // Create empty directories
      await fs.ensureDir(join(packageDir, 'empty-commands'));
      await fs.ensureDir(join(packageDir, 'empty-scripts', 'subdir'));

      const result = await packageCmd(packageDir, {});

      expect(await fs.pathExists(result)).toBe(true);
      
      // Verify package is valid despite empty directories
      const stats = await fs.stat(result);
      expect(stats.size).toBeGreaterThan(100);
    });

    test('should preserve file permissions', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'permissions-test',
        version: '1.0.0'
      });

      // Create executable script
      const scriptPath = join(packageDir, 'scripts', 'executable.sh');
      await fs.ensureDir(join(packageDir, 'scripts'));
      await fs.writeFile(scriptPath, '#!/bin/bash\necho "executable"');
      await fs.chmod(scriptPath, 0o755);

      const result = await packageCmd(packageDir, {});

      expect(await fs.pathExists(result)).toBe(true);

      // Extract and check permissions
      const extractDir = join(testDir, 'extracted-permissions');
      await fs.ensureDir(extractDir);
      
      await tar.extract({
        file: result,
        cwd: extractDir
      });

      const extractedScript = join(extractDir, 'scripts', 'executable.sh');
      const stats = await fs.stat(extractedScript);
      
      // Check that execute permission is preserved (at least for owner)
      expect(stats.mode & 0o100).toBeTruthy();
    });

    test('should handle large packages efficiently', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'large-package',
        version: '1.0.0'
      });

      // Create many files to simulate a large package
      for (let i = 0; i < 100; i++) {
        const dir = join(packageDir, 'commands', `category-${Math.floor(i / 10)}`);
        await fs.ensureDir(dir);
        await fs.writeFile(
          join(dir, `command-${i}.md`), 
          `# Command ${i}\n${'x'.repeat(1000)}`  // 1KB per file
        );
      }

      const startTime = Date.now();
      const result = await packageCmd(packageDir, {});
      const duration = Date.now() - startTime;

      expect(await fs.pathExists(result)).toBe(true);
      
      // Should complete in reasonable time (less than 30 seconds)
      expect(duration).toBeLessThan(30000);
      
      // Verify compression worked
      const stats = await fs.stat(result);
      expect(stats.size).toBeLessThan(50000); // Should be compressed significantly
    });

    test('should use current directory when no directory specified', async () => {
      // Change to package directory
      process.chdir(packageDir);

      await TestUtils.createTestPackage('.', {
        name: 'current-dir-package',
        version: '1.0.0'
      }, {
        'commands/test.md': '# Test Command'
      });

      const result = await packageCmd();

      const expectedPath = await fs.realpath(join(packageDir, 'current-dir-package-1.0.0.tar.gz'));
      expect(result).toBe(expectedPath);
      expect(await fs.pathExists(expectedPath)).toBe(true);
    });

    test('should handle symlinks correctly', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'symlink-test',
        version: '1.0.0'
      });

      // Create a file and a symlink to it
      const realFile = join(packageDir, 'commands', 'real.md');
      await fs.ensureDir(join(packageDir, 'commands'));
      await fs.writeFile(realFile, '# Real Command');
      
      try {
        const symlinkFile = join(packageDir, 'commands', 'link.md');
        await fs.symlink('real.md', symlinkFile);

        const result = await packageCmd(packageDir, {});

        expect(await fs.pathExists(result)).toBe(true);

        // Extract and verify symlink handling
        const extractDir = join(testDir, 'extracted-symlinks');
        await fs.ensureDir(extractDir);
        
        await tar.extract({
          file: result,
          cwd: extractDir
        });

        expect(await fs.pathExists(join(extractDir, 'commands', 'real.md'))).toBe(true);
        // Symlink behavior depends on tar implementation
        expect(await fs.pathExists(join(extractDir, 'commands', 'link.md'))).toBe(true);
      } catch (error) {
        // Skip symlink test if not supported on this system
        if (error.code !== 'EPERM' && error.code !== 'ENOTSUP') {
          throw error;
        }
      }
    });

    test('should validate manifest before packaging', async () => {
      // Create package with invalid manifest
      const invalidManifest = `
name: invalid-package
version: not-a-version
description: Invalid package
author: Test Author
`;

      await fs.writeFile(join(packageDir, 'prism-package.yaml'), invalidManifest);
      await fs.ensureDir(join(packageDir, 'commands'));
      await fs.writeFile(join(packageDir, 'commands', 'test.md'), '# Test');

      await expect(packageCmd(packageDir, {})).rejects.toThrow();
    });
  });
});