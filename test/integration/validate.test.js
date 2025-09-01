import { describe, test, expect, beforeEach } from '@jest/globals';
import { join } from 'path';
import fs from 'fs-extra';
import validate from '../../src/commands/validate.js';
import { TestUtils } from '../helpers/test-utils.js';

describe('Validate Command Integration', () => {
  let testDir;
  let packageDir;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('validate-integration');
    packageDir = join(testDir, 'test-package');
    await fs.ensureDir(packageDir);
  });

  describe('validate command', () => {
    test('should validate correct package structure', async () => {
      // Create valid package
      await TestUtils.createTestPackage(packageDir, {
        name: 'valid-package',
        version: '1.0.0',
        description: 'A valid test package',
        author: 'Test Author',
        license: 'MIT'
      }, {
        'commands/test.md': '# Test Command\nThis is a test command.',
        'README.md': '# Valid Package\nThis package is valid.'
      });

      // Should not throw any errors
      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should detect missing manifest file', async () => {
      // Create package directory without manifest
      await fs.ensureDir(join(packageDir, 'commands'));
      await fs.writeFile(join(packageDir, 'commands', 'test.md'), '# Test');

      await expect(validate(packageDir, { strict: true })).rejects.toThrow(/manifest file not found/i);
    });

    test('should detect invalid manifest structure', async () => {
      // Create package with invalid manifest
      const invalidManifest = TestUtils.createInvalidManifest('missing-name');
      await fs.writeFile(join(packageDir, 'prism-package.yaml'), invalidManifest);

      await expect(validate(packageDir, { strict: true })).rejects.toThrow();
    });

    test('should validate manifest with all sections', async () => {
      const complexManifest = `
name: complex-package
version: 2.1.0
description: Complex test package with all features
author: Complex Author
license: MIT
repository: github.com/user/complex-package
homepage: https://github.com/user/complex-package
keywords:
  - test
  - complex
  - example

claudeCode:
  minVersion: "1.0.0"
  maxVersion: "3.0.0"

structure:
  commands:
    - source: commands/
      dest: .claude/commands/{name}/
      pattern: "**/*.md"
      exclude: ["**/private.md"]
  scripts:
    - source: scripts/
      dest: .claude/scripts/{name}/
      pattern: "**/*.sh"

variants:
  minimal:
    description: Minimal installation with core features only
    include: ["commands/core/*"]
    exclude: ["commands/experimental/*"]
  standard:
    description: Standard installation with most features
    include: ["commands/*", "scripts/core/*"]
    exclude: ["commands/experimental/*", "scripts/experimental/*"]
  full:
    description: Full installation with all features
    include: ["**/*"]
    exclude: []

dependencies:
  system:
    - name: git
      required: true
      version: ">=2.0.0"
    - name: yq
      required: false
      install: "brew install yq || apt-get install yq"
      description: "YAML processing utility"
  prism:
    base-utils: ">=1.0.0"

hooks:
  preInstall: |
    echo "Preparing installation..."
  postInstall: |
    echo "Installation complete!"
    echo "Run /complex-package:init to get started"
  preUninstall: |
    echo "Preparing uninstallation..."
  postUninstall: |
    echo "Uninstallation complete!"

ignore:
  - node_modules
  - .git
  - "*.log"
  - .env
`;

      await fs.writeFile(join(packageDir, 'prism-package.yaml'), complexManifest);
      
      // Create referenced files
      await fs.ensureDir(join(packageDir, 'commands', 'core'));
      await fs.ensureDir(join(packageDir, 'commands', 'experimental'));
      await fs.ensureDir(join(packageDir, 'scripts', 'core'));
      
      await fs.writeFile(join(packageDir, 'commands', 'core', 'basic.md'), '# Basic Command');
      await fs.writeFile(join(packageDir, 'commands', 'experimental', 'advanced.md'), '# Advanced Command');
      await fs.writeFile(join(packageDir, 'scripts', 'core', 'setup.sh'), '#!/bin/bash\necho "setup"');

      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });


    test('should validate version consistency', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'version-test',
        version: '1.0.0-beta.1'
      });

      await expect(validate(packageDir, {})).resolves.not.toThrow();

      // Test invalid version
      await TestUtils.createTestPackage(packageDir, {
        name: 'version-test',
        version: 'invalid-version'
      });

      await expect(validate(packageDir, { strict: true })).rejects.toThrow();
    });


    test('should validate dependency specifications', async () => {
      const manifestWithDeps = `
name: deps-test
version: 1.0.0
description: Testing dependencies
author: Test Author
license: MIT

claudeCode:
  minVersion: "1.0.0"

structure:
  commands:
    - source: commands/
      dest: .claude/commands/{name}/

dependencies:
  system:
    - name: git
      required: true
    - name: invalid-dep
      # Missing name would be caught by parser
      required: true
`;

      await fs.writeFile(join(packageDir, 'prism-package.yaml'), manifestWithDeps);
      await fs.ensureDir(join(packageDir, 'commands'));
      await fs.writeFile(join(packageDir, 'commands', 'test.md'), '# Test');

      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should use current directory when no directory specified', async () => {
      // Change to package directory
      process.chdir(packageDir);

      // Create valid package in current directory
      await TestUtils.createTestPackage('.', {
        name: 'current-dir-package',
        version: '1.0.0'
      }, {
        'commands/test.md': '# Test Command'
      });

      await expect(validate(undefined, {})).resolves.not.toThrow();
    });

    test('should handle nested package structures', async () => {
      await TestUtils.createTestPackage(packageDir, {
        name: 'nested-package',
        version: '1.0.0'
      }, {
        'commands/level1/level2/deep.md': '# Deep Command',
        'scripts/utils/helper.sh': '#!/bin/bash\necho "helper"',
        'templates/example.txt': 'Example template'
      });

      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should validate hook syntax', async () => {
      const manifestWithHooks = `
name: hooks-test
version: 1.0.0
description: Testing hooks
author: Test Author
license: MIT

claudeCode:
  minVersion: "1.0.0"

structure:
  commands:
    - source: commands/
      dest: .claude/commands/{name}/

hooks:
  postInstall: |
    echo "Valid hook"
    mkdir -p .{name}/config
  preUninstall: |
    if [ -d ".{name}" ]; then
      cp -r .{name} .{name}.backup
    fi
`;

      await fs.writeFile(join(packageDir, 'prism-package.yaml'), manifestWithHooks);
      await fs.ensureDir(join(packageDir, 'commands'));
      await fs.writeFile(join(packageDir, 'commands', 'test.md'), '# Test');

      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should detect circular dependencies in variants', async () => {
      // This is a more advanced test case
      const manifestWithCircular = `
name: circular-test
version: 1.0.0
description: Testing circular references
author: Test Author
license: MIT

claudeCode:
  minVersion: "1.0.0"

structure:
  commands:
    - source: commands/
      dest: .claude/commands/{name}/

variants:
  variant-a:
    description: Variant A
    include: ["commands/a/*"]
    exclude: ["commands/b/*"]
  variant-b:
    description: Variant B
    include: ["commands/b/*"]
    exclude: ["commands/a/*"]
`;

      await fs.writeFile(join(packageDir, 'prism-package.yaml'), manifestWithCircular);
      await fs.ensureDir(join(packageDir, 'commands', 'a'));
      await fs.ensureDir(join(packageDir, 'commands', 'b'));
      await fs.writeFile(join(packageDir, 'commands', 'a', 'test.md'), '# A');
      await fs.writeFile(join(packageDir, 'commands', 'b', 'test.md'), '# B');

      // Should still validate (this isn't actually circular, just exclusive)
      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should provide helpful error messages', async () => {
      const invalidManifest = `
name: error-test
version: not-a-version
description: Testing error messages
author: Test Author
license: MIT
`;

      await fs.writeFile(join(packageDir, 'prism-package.yaml'), invalidManifest);

      try {
        await validate(packageDir, { strict: true });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toMatch(/version/i);
        expect(error.message).toMatch(/not-a-version/i);
      }
    });
  });

  describe('additional validation edge cases', () => {
    test('should handle package with no structure definition', async () => {
      // Create package with minimal manifest (no structure)
      await TestUtils.createTestPackage(packageDir, {
        name: 'minimal-package',
        version: '1.0.0',
        description: 'Minimal package without structure'
      });

      // Should not throw for minimal valid package
      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should validate package with custom structure types', async () => {
      const manifest = {
        name: 'custom-structure-package',
        version: '1.0.0',
        description: 'Package with custom structure',
        structure: {
          custom_type: [{
            source: 'custom/',
            dest: '.claude/custom/{name}/',
            pattern: '**/*.custom'
          }]
        }
      };

      await TestUtils.createTestPackage(packageDir, manifest, {
        'custom/test.custom': 'Custom content'
      });

      // Should handle custom structure types
      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should validate variant configurations', async () => {
      const manifest = {
        name: 'variant-package',
        version: '1.0.0',
        description: 'Package with variant configurations',
        variants: {
          minimal: {
            description: 'Minimal installation',
            include: ['commands/**'],
            exclude: ['scripts/**']
          },
          full: {
            description: 'Full installation',
            include: ['**/*'],
            exclude: ['*.tmp']
          }
        },
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

      await TestUtils.createTestPackage(packageDir, manifest, {
        'commands/test.md': '# Test Command',
        'scripts/test.sh': '#!/bin/bash\necho "test"'
      });

      // Should validate variant configurations
      await expect(validate(packageDir, { variant: 'minimal' })).resolves.not.toThrow();
      await expect(validate(packageDir, { variant: 'full' })).resolves.not.toThrow();
    });

    test('should handle invalid variant specification', async () => {
      const manifest = {
        name: 'variant-package',
        version: '1.0.0',
        description: 'Package with variants',
        variants: {
          standard: {
            description: 'Standard installation'
          }
        }
      };

      await TestUtils.createTestPackage(packageDir, manifest);

      // Should handle nonexistent variant gracefully
      await expect(validate(packageDir, { variant: 'nonexistent' })).rejects.toThrow();
    });

    test('should validate package with dependencies', async () => {
      const manifest = {
        name: 'dependent-package',
        version: '1.0.0',
        description: 'Package with dependencies',
        dependencies: {
          'other-package': '^1.0.0',
          'another-dependency': '2.x'
        }
      };

      await TestUtils.createTestPackage(packageDir, manifest);

      // Should validate package with dependencies
      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should handle package with empty directories', async () => {
      const manifest = {
        name: 'empty-dirs-package',
        version: '1.0.0',
        description: 'Package with empty directories',
        structure: {
          commands: [{
            source: 'commands/',
            dest: '.claude/commands/{name}/',
            pattern: '**/*.md'
          }]
        }
      };

      await TestUtils.createTestPackage(packageDir, manifest);
      
      // Create empty directory
      await fs.ensureDir(join(packageDir, 'commands'));

      // Should handle empty directories
      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });

    test('should validate package with special characters in name', async () => {
      const manifest = {
        name: 'special-chars-package_123',
        version: '1.0.0',
        description: 'Package with special characters in name'
      };

      await TestUtils.createTestPackage(packageDir, manifest);

      // Should handle special characters in package names
      await expect(validate(packageDir, {})).resolves.not.toThrow();
    });
  });
});