import fs from 'fs-extra';
import { join } from 'path';
import { randomBytes } from 'crypto';

export class TestUtils {
  /**
   * Create a temporary test directory
   */
  static async createTempDir(prefix = 'test') {
    const tempDir = join(global.TEST_DIR, `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.ensureDir(tempDir);
    return tempDir;
  }

  /**
   * Create a test package structure
   */
  static async createTestPackage(dir, manifest, files = {}) {
    // Ensure the directory exists first
    await fs.ensureDir(dir);
    
    // Write manifest file
    await fs.writeFile(
      join(dir, 'prism-package.yaml'), 
      typeof manifest === 'string' ? manifest : this.createManifestYaml(manifest)
    );

    // Create files
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(dir, filePath);
      await fs.ensureDir(join(fullPath, '..'));
      await fs.writeFile(fullPath, content);
    }

    return dir;
  }

  /**
   * Generate a manifest YAML from an object
   */
  static createManifestYaml(manifest = {}) {
    const defaults = {
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package',
      author: 'Test Suite',
      license: 'MIT',
      claudeCode: {
        minVersion: '1.0.0'
      },
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
        default: {
          description: 'Default installation',
          include: ['**/*']
        }
      }
    };

    // Deep merge function
    const deepMerge = (target, source) => {
      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    };

    const merged = deepMerge(defaults, manifest);
    
    // Build YAML dynamically based on what's available
    let yaml = `name: ${merged.name}
version: ${merged.version}
description: ${merged.description}
author: ${merged.author}
license: ${merged.license}

claudeCode:
  minVersion: "${merged.claudeCode.minVersion}"
`;

    // Add structure section if it exists
    if (merged.structure) {
      yaml += '\nstructure:\n';
      
      if (merged.structure.commands && merged.structure.commands.length > 0) {
        yaml += '  commands:\n';
        for (const cmd of merged.structure.commands) {
          yaml += `    - source: ${cmd.source}\n      dest: ${cmd.dest}\n`;
          if (cmd.pattern) {
            yaml += `      pattern: "${cmd.pattern}"\n`;
          }
        }
      }
      
      if (merged.structure.scripts && merged.structure.scripts.length > 0) {
        yaml += '  scripts:\n';
        for (const script of merged.structure.scripts) {
          yaml += `    - source: ${script.source}\n      dest: ${script.dest}\n`;
          if (script.pattern) {
            yaml += `      pattern: "${script.pattern}"\n`;
          }
        }
      }
      
      // Add other structure types dynamically
      for (const [key, value] of Object.entries(merged.structure)) {
        if (key !== 'commands' && key !== 'scripts' && Array.isArray(value) && value.length > 0) {
          yaml += `  ${key}:\n`;
          for (const item of value) {
            yaml += `    - source: ${item.source}\n      dest: ${item.dest}\n`;
            if (item.pattern) {
              yaml += `      pattern: "${item.pattern}"\n`;
            }
          }
        }
      }
    }

    // Add variants section
    if (merged.variants) {
      yaml += '\nvariants:\n';
      for (const [variantName, variantConfig] of Object.entries(merged.variants)) {
        yaml += `  ${variantName}:\n`;
        if (variantConfig.description) {
          yaml += `    description: ${variantConfig.description}\n`;
        }
        if (variantConfig.include) {
          yaml += `    include: ${JSON.stringify(variantConfig.include)}\n`;
        }
        if (variantConfig.exclude) {
          yaml += `    exclude: ${JSON.stringify(variantConfig.exclude)}\n`;
        }
      }
    }

    return yaml;
  }

  /**
   * Create a test project with PRISM initialized
   */
  static async createTestProject() {
    const projectDir = await this.createTempDir('project');
    
    // Create basic PRISM structure
    await fs.ensureDir(join(projectDir, '.prism'));
    await fs.ensureDir(join(projectDir, '.claude', 'commands'));
    await fs.ensureDir(join(projectDir, '.claude', 'scripts'));
    
    // Create config file
    const config = {
      version: '1.0.0',
      registry: 'https://registry.prism-claude.io',
      packages: {},
      config: {
        autoUpdate: false,
        verbose: false,
        confirmUninstall: true,
        keepBackups: true,
        defaultVariant: 'standard'
      }
    };
    
    await fs.writeJson(join(projectDir, '.prism', 'config.json'), config, { spaces: 2 });
    
    return projectDir;
  }

  /**
   * Create invalid manifest for testing error cases
   */
  static createInvalidManifest(type = 'missing-name') {
    const manifests = {
      'missing-name': `version: 1.0.0
description: Invalid package missing name
author: Test`,
      
      'invalid-version': `name: test-package
version: not-a-version
description: Invalid package with bad version
author: Test`,
      
      'missing-structure': `name: test-package
version: 1.0.0
description: Package missing structure
author: Test`,
      
      'invalid-yaml': `name: test-package
version: 1.0.0
description: Invalid YAML
  invalid: - - - syntax`,
    };
    
    return manifests[type] || manifests['missing-name'];
  }

  /**
   * Run a command and capture output
   */
  static async runCommand(command, args = [], options = {}) {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    
    try {
      const result = await execFileAsync(command, args, {
        encoding: 'utf8',
        ...options
      });
      
      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr
      };
    } catch (error) {
      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        code: error.code
      };
    }
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Check if a directory has the expected PRISM structure
   */
  static async verifyPrismStructure(dir) {
    const checks = [
      fs.pathExists(join(dir, '.prism')),
      fs.pathExists(join(dir, '.prism', 'config.json')),
      fs.pathExists(join(dir, '.claude')),
      fs.pathExists(join(dir, '.claude', 'commands')),
      fs.pathExists(join(dir, '.claude', 'scripts'))
    ];
    
    const results = await Promise.all(checks);
    return results.every(Boolean);
  }

  /**
   * Get file tree for assertions
   */
  static async getFileTree(dir, relativeTo = dir) {
    const tree = {};
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(dir, entry.name).replace(relativeTo + '/', '').replace(relativeTo, '');
      
      if (entry.isDirectory()) {
        tree[relativePath] = await this.getFileTree(fullPath, relativeTo);
      } else {
        tree[relativePath] = await fs.readFile(fullPath, 'utf8');
      }
    }
    
    return tree;
  }
}