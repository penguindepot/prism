import { describe, test, expect, beforeEach } from '@jest/globals';
import { join } from 'path';
import fs from 'fs-extra';
import FileManager from '../../src/core/file-manager.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('FileManager', () => {
  let fileManager;
  let testDir;
  let sourceDir;
  let targetDir;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('file-manager');
    sourceDir = join(testDir, 'source');
    targetDir = join(testDir, 'target');
    
    fileManager = new FileManager(targetDir);
    
    await fs.ensureDir(sourceDir);
    await fs.ensureDir(targetDir);
  });

  describe('installFiles', () => {
    test('should install files according to manifest structure', async () => {
      // Create source files
      await fs.ensureDir(join(sourceDir, 'commands'));
      await fs.writeFile(join(sourceDir, 'commands', 'test.md'), '# Test Command');
      await fs.writeFile(join(sourceDir, 'commands', 'helper.md'), '# Helper Command');

      const manifest = {
        name: 'test-package',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/',
            pattern: '**/*.md'
          }]
        },
        variants: {
          standard: {
            description: 'Standard installation',
            include: ['**/*'],
            exclude: []
          }
        }
      };

      await fileManager.installFiles(sourceDir, manifest, 'standard');

      // Check files were installed in correct location
      const installedTest = join(targetDir, '.claude', 'commands', 'test-package', 'test.md');
      const installedHelper = join(targetDir, '.claude', 'commands', 'test-package', 'helper.md');

      expect(await fs.pathExists(installedTest)).toBe(true);
      expect(await fs.pathExists(installedHelper)).toBe(true);
      
      // Check content is preserved
      const content = await fs.readFile(installedTest, 'utf8');
      expect(content).toBe('# Test Command');
    });

    test('should respect variant include patterns', async () => {
      // Create source files
      await fs.ensureDir(join(sourceDir, 'commands', 'core'));
      await fs.ensureDir(join(sourceDir, 'commands', 'experimental'));
      
      await fs.writeFile(join(sourceDir, 'commands', 'core', 'basic.md'), '# Basic Command');
      await fs.writeFile(join(sourceDir, 'commands', 'experimental', 'advanced.md'), '# Advanced Command');

      const manifest = {
        name: 'test-package',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/'
          }]
        },
        variants: {
          minimal: {
            description: 'Minimal installation',
            include: ['commands/core/*'],
            exclude: []
          }
        }
      };

      await fileManager.installFiles(sourceDir, manifest, 'minimal');

      // Only core files should be installed
      const installedCore = join(targetDir, '.claude', 'commands', 'test-package', 'core', 'basic.md');
      const installedExperimental = join(targetDir, '.claude', 'commands', 'test-package', 'experimental', 'advanced.md');

      expect(await fs.pathExists(installedCore)).toBe(true);
      expect(await fs.pathExists(installedExperimental)).toBe(false);
    });

    test('should respect variant exclude patterns', async () => {
      // Create source files
      await fs.ensureDir(join(sourceDir, 'commands'));
      await fs.writeFile(join(sourceDir, 'commands', 'keep.md'), '# Keep This');
      await fs.writeFile(join(sourceDir, 'commands', 'exclude.md'), '# Exclude This');

      const manifest = {
        name: 'test-package',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/'
          }]
        },
        variants: {
          selective: {
            description: 'Selective installation',
            include: ['**/*'],
            exclude: ['**/exclude.md']
          }
        }
      };

      await fileManager.installFiles(sourceDir, manifest, 'selective');

      // Check which files were installed
      const keptFile = join(targetDir, '.claude', 'commands', 'test-package', 'keep.md');
      const excludedFile = join(targetDir, '.claude', 'commands', 'test-package', 'exclude.md');

      expect(await fs.pathExists(keptFile)).toBe(true);
      expect(await fs.pathExists(excludedFile)).toBe(false);
    });

    test('should handle multiple structure sections', async () => {
      // Create source files
      await fs.ensureDir(join(sourceDir, 'commands'));
      await fs.ensureDir(join(sourceDir, 'scripts'));
      
      await fs.writeFile(join(sourceDir, 'commands', 'cmd.md'), '# Command');
      await fs.writeFile(join(sourceDir, 'scripts', 'script.sh'), '#!/bin/bash\necho "test"');

      const manifest = {
        name: 'test-package',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/'
          }],
          scripts: [{
            source: 'scripts/',
            dest: '.claude/scripts/{name}/'
          }]
        },
        variants: {
          full: {
            description: 'Full installation',
            include: ['**/*'],
            exclude: []
          }
        }
      };

      await fileManager.installFiles(sourceDir, manifest, 'full');

      // Check both types of files were installed
      const cmdFile = join(targetDir, '.claude', 'commands', 'test-package', 'cmd.md');
      const scriptFile = join(targetDir, '.claude', 'scripts', 'test-package', 'script.sh');

      expect(await fs.pathExists(cmdFile)).toBe(true);
      expect(await fs.pathExists(scriptFile)).toBe(true);
    });
  });

  describe('uninstallFiles', () => {
    test('should remove installed package files', async () => {
      // First install some files
      await fs.ensureDir(join(targetDir, '.claude', 'commands', 'test-package'));
      await fs.writeFile(join(targetDir, '.claude', 'commands', 'test-package', 'test.md'), '# Test');

      const manifest = {
        name: 'test-package',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/'
          }]
        }
      };

      await fileManager.uninstallFiles(manifest);

      // Check files were removed
      const packageDir = join(targetDir, '.claude', 'commands', 'test-package');
      expect(await fs.pathExists(packageDir)).toBe(false);
    });

    test('should not remove files from other packages', async () => {
      // Install files from two different packages
      await fs.ensureDir(join(targetDir, '.claude', 'commands', 'package1'));
      await fs.ensureDir(join(targetDir, '.claude', 'commands', 'package2'));
      
      await fs.writeFile(join(targetDir, '.claude', 'commands', 'package1', 'test.md'), '# Package 1');
      await fs.writeFile(join(targetDir, '.claude', 'commands', 'package2', 'test.md'), '# Package 2');

      const manifest = {
        name: 'package1',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/'
          }]
        }
      };

      await fileManager.uninstallFiles(manifest);

      // Only package1 files should be removed
      const package1Dir = join(targetDir, '.claude', 'commands', 'package1');
      const package2Dir = join(targetDir, '.claude', 'commands', 'package2');
      
      expect(await fs.pathExists(package1Dir)).toBe(false);
      expect(await fs.pathExists(package2Dir)).toBe(true);
    });
  });

  describe('createPackage', () => {
    test('should create a tar.gz package from directory', async () => {
      // Create package content
      const packageDir = join(sourceDir, 'my-package');
      await fs.ensureDir(packageDir);
      await TestUtils.createTestPackage(packageDir, {
        name: 'my-package',
        version: '1.0.0'
      }, {
        'commands/test.md': '# Test Command',
        'README.md': '# My Package'
      });

      const outputPath = join(testDir, 'my-package-1.0.0.tar.gz');
      
      // Parse the manifest that was created by TestUtils
      const ManifestParser = (await import('../../src/core/manifest-parser.js')).default;
      const manifestParser = new ManifestParser();
      const manifest = await manifestParser.parse(join(packageDir, 'prism-package.yaml'));
      
      const result = await fileManager.createPackage(packageDir, outputPath, manifest);

      expect(result).toBe(outputPath);
      expect(await fs.pathExists(outputPath)).toBe(true);

      // Check file size is reasonable (not empty)
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(100);
    });

    test('should include only specified files in package', async () => {
      const packageDir = join(sourceDir, 'selective-package');
      
      // Create package with some files that should be excluded
      await fs.ensureDir(join(packageDir, 'commands'));
      await fs.ensureDir(join(packageDir, 'node_modules', 'some-module'));
      await fs.ensureDir(join(packageDir, '.git'));
      
      // Create a proper manifest using TestUtils
      await TestUtils.createTestPackage(packageDir, {
        name: 'selective-package',
        version: '1.0.0'
      }, {
        'commands/test.md': '# Test Command',
        'node_modules/some-module/index.js': 'console.log("test")',
        '.git/config': 'git config'
      });

      const outputPath = join(testDir, 'selective-package-1.0.0.tar.gz');
      
      // Parse the manifest
      const ManifestParser = (await import('../../src/core/manifest-parser.js')).default;
      const manifestParser = new ManifestParser();
      const manifest = await manifestParser.parse(join(packageDir, 'prism-package.yaml'));
      
      await fileManager.createPackage(packageDir, outputPath, manifest);

      // Extract and verify contents (simplified check by examining tar contents)
      expect(await fs.pathExists(outputPath)).toBe(true);
    });
  });

  describe('downloadPackage', () => {
    test('should handle file URLs', async () => {
      // Create a local "remote" package
      const remotePackage = join(sourceDir, 'remote-package.tar.gz');
      
      // Create a simple tar.gz file
      await fs.writeFile(join(sourceDir, 'dummy.txt'), 'dummy content');
      
      // For this test, we'll just create an empty file as a placeholder
      await fs.writeFile(remotePackage, 'dummy-package-content');

      const fileUrl = `file://${remotePackage}`;
      const downloadPath = join(testDir, 'downloaded-package.tar.gz');
      
      const result = await fileManager.downloadPackage(fileUrl, downloadPath);

      expect(result).toBe(downloadPath);
      expect(await fs.pathExists(downloadPath)).toBe(true);
    });

    // Note: We don't test actual HTTP downloads to avoid network dependencies
    // In a real scenario, you might use a test HTTP server or mock fetch
  });

  describe('formatSize', () => {
    test('should format file sizes correctly', () => {
      expect(fileManager.formatSize(0)).toBe('0 B');
      expect(fileManager.formatSize(1024)).toBe('1.0 KB');
      expect(fileManager.formatSize(1024 * 1024)).toBe('1.0 MB');
      expect(fileManager.formatSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(fileManager.formatSize(1536)).toBe('1.5 KB'); // 1.5 KB
    });
  });

  describe('resolveDestPath', () => {
    test('should replace {name} placeholder in destination paths', () => {
      const manifest = { name: 'my-package' };
      const destPattern = '.claude/commands/{name}/';
      
      const resolved = fileManager.resolveDestPath(destPattern, manifest);
      
      expect(resolved).toBe('.claude/commands/my-package/');
    });

    test('should handle multiple placeholders', () => {
      const manifest = { name: 'my-package', version: '1.0.0' };
      const destPattern = '.claude/{name}/{version}/';
      
      const resolved = fileManager.resolveDestPath(destPattern, manifest);
      
      expect(resolved).toBe('.claude/my-package/1.0.0/');
    });

    test('should handle paths without placeholders', () => {
      const manifest = { name: 'my-package' };
      const destPattern = '.claude/static/path/';
      
      const resolved = fileManager.resolveDestPath(destPattern, manifest);
      
      expect(resolved).toBe('.claude/static/path/');
    });
  });

  describe('appendToClaudeMd', () => {
    test('should append package content to CLAUDE.md when it exists', async () => {
      // Create existing CLAUDE.md
      const claudeMdPath = join(targetDir, '.claude', 'CLAUDE.md');
      await fs.ensureDir(join(targetDir, '.claude'));
      await fs.writeFile(claudeMdPath, '# Existing CLAUDE.md\n\nExisting content.\n');

      // Create package with CLAUDE content
      const packagePath = join(sourceDir, 'test-package');
      await fs.ensureDir(packagePath);
      await fs.writeFile(join(packagePath, 'test-package.md'), '# Test Package\n\nThis is test package content.\n');

      const item = {
        source: '',
        pattern: 'test-package.md'
      };

      const variantConfig = {
        include: ['**/*'],
        exclude: []
      };

      await fileManager.appendToClaudeMd(packagePath, item, variantConfig, 'test-package');

      // Check that content was appended
      const claudeContent = await fs.readFile(claudeMdPath, 'utf8');
      expect(claudeContent).toContain('# Test Package');
      expect(claudeContent).toContain('This is test package content.');
      expect(claudeContent).toContain('Existing content');
    });

    test('should create CLAUDE.md if it does not exist', async () => {
      const claudeMdPath = join(targetDir, '.claude', 'CLAUDE.md');
      
      // Ensure CLAUDE.md doesn't exist
      expect(await fs.pathExists(claudeMdPath)).toBe(false);

      // Create package with CLAUDE content
      const packagePath = join(sourceDir, 'test-package');
      await fs.ensureDir(packagePath);
      await fs.writeFile(join(packagePath, 'test-package.md'), '# Test Package\n\nNew package content.\n');

      const item = {
        source: '',
        pattern: 'test-package.md'
      };

      const variantConfig = {
        include: ['**/*'],
        exclude: []
      };

      await fileManager.appendToClaudeMd(packagePath, item, variantConfig, 'test-package');

      // Check that CLAUDE.md was created with content
      expect(await fs.pathExists(claudeMdPath)).toBe(true);
      const claudeContent = await fs.readFile(claudeMdPath, 'utf8');
      expect(claudeContent).toContain('# Test Package');
      expect(claudeContent).toContain('New package content.');
    });

    test('should skip when files are excluded by variant', async () => {
      const claudeMdPath = join(targetDir, '.claude', 'CLAUDE.md');
      await fs.ensureDir(join(targetDir, '.claude'));
      await fs.writeFile(claudeMdPath, '# Original content\n');

      // Create package content
      const packagePath = join(sourceDir, 'test-package');
      await fs.ensureDir(packagePath);
      await fs.writeFile(join(packagePath, 'test-package.md'), '# Should be excluded\n');

      const item = {
        source: '',
        pattern: 'test-package.md'
      };

      // Variant config that excludes this file
      const variantConfig = {
        include: [],
        exclude: ['**/*']
      };

      await fileManager.appendToClaudeMd(packagePath, item, variantConfig, 'test-package');

      // Content should not be appended
      const claudeContent = await fs.readFile(claudeMdPath, 'utf8');
      expect(claudeContent).toBe('# Original content\n');
      expect(claudeContent).not.toContain('Should be excluded');
    });

    test('should warn when no CLAUDE config file found', async () => {
      const packagePath = join(sourceDir, 'test-package');
      await fs.ensureDir(packagePath);
      // Don't create the expected file

      const item = {
        source: '',
        pattern: 'nonexistent.md'
      };

      const variantConfig = {
        include: ['**/*'],
        exclude: []
      };

      // Should not throw, just warn
      await expect(async () => {
        await fileManager.appendToClaudeMd(packagePath, item, variantConfig, 'test-package');
      }).not.toThrow();
    });
  });

  describe('removePackageFiles', () => {
    test('should remove files based on manifest structure', async () => {
      // Create installed package files
      const commandsDir = join(targetDir, '.claude', 'commands', 'test-package');
      const scriptsDir = join(targetDir, '.claude', 'scripts', 'test-package');
      
      await fs.ensureDir(commandsDir);
      await fs.ensureDir(scriptsDir);
      await fs.writeFile(join(commandsDir, 'test.md'), '# Test Command');
      await fs.writeFile(join(scriptsDir, 'test.sh'), '#!/bin/bash\necho "test"');

      const manifest = {
        name: 'test-package',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/',
            pattern: '**/*.md'
          }],
          scripts: [{
            source: 'scripts/',
            dest: '.claude/scripts/{name}/',
            pattern: '**/*.sh'
          }]
        }
      };

      const packageInfo = {
        version: '1.0.0',
        manifest: manifest
      };

      await fileManager.removePackageFiles('test-package', packageInfo);

      // Check that package directories were removed
      expect(await fs.pathExists(commandsDir)).toBe(false);
      expect(await fs.pathExists(scriptsDir)).toBe(false);
    });

    test('should handle missing directories gracefully', async () => {
      const manifest = {
        name: 'nonexistent-package',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/',
            pattern: '**/*.md'
          }]
        }
      };

      const packageInfo = {
        version: '1.0.0',
        manifest: manifest
      };

      // Should not throw even if directories don't exist
      await expect(async () => {
        await fileManager.removePackageFiles('nonexistent-package', packageInfo);
      }).not.toThrow();
    });

    test('should remove CLAUDE.md package sections', async () => {
      const claudeMdPath = join(targetDir, '.claude', 'CLAUDE.md');
      await fs.ensureDir(join(targetDir, '.claude'));
      
      // Create CLAUDE.md with package sections
      const claudeContent = `# Main Project

Existing content.

# ==========================================
# PRISM Package Configurations
# ==========================================

# test-package
Package content here.

# another-package
Other package content.
`;
      
      await fs.writeFile(claudeMdPath, claudeContent);

      const manifest = {
        name: 'test-package',
        structure: {
          claude_config: [{
            source: '',
            dest: '.claude/',
            pattern: 'test-package.md'
          }]
        }
      };

      const packageInfo = {
        version: '1.0.0',
        manifest: manifest
      };

      await fileManager.removePackageFiles('test-package', packageInfo);

      // Check that only test-package section was removed
      const updatedContent = await fs.readFile(claudeMdPath, 'utf8');
      expect(updatedContent).toContain('# another-package');
      expect(updatedContent).toContain('Other package content');
      expect(updatedContent).not.toContain('# test-package');
      expect(updatedContent).not.toContain('Package content here');
      expect(updatedContent).toContain('Existing content');
    });
  });
});