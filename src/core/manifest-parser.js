import fs from 'fs-extra';
import YAML from 'yaml';
import semver from 'semver';
import { ValidationError } from '../utils/errors.js';

class ManifestParser {
  /**
   * Parse a PRISM package manifest file
   */
  async parse(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return this.parseYaml(content);
    } catch (error) {
      throw new ValidationError(`Failed to parse manifest: ${error.message}`);
    }
  }

  /**
   * Parse YAML content into manifest object
   */
  parseYaml(yamlContent) {
    try {
      const manifest = YAML.parse(yamlContent);
      return this.normalize(manifest);
    } catch (error) {
      throw new ValidationError(`Invalid YAML in manifest: ${error.message}`);
    }
  }

  /**
   * Normalize and validate manifest structure
   */
  normalize(manifest) {
    if (!manifest || typeof manifest !== 'object') {
      throw new ValidationError('Manifest must be a valid object');
    }

    // Required fields
    const required = ['name', 'version', 'description'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    }

    // Normalize version
    if (!semver.valid(manifest.version)) {
      throw new ValidationError(`Invalid version format: ${manifest.version}`);
    }

    // Normalize name (must be lowercase, no spaces)
    if (!/^[a-z0-9-_]+$/.test(manifest.name)) {
      throw new ValidationError('Package name must contain only lowercase letters, numbers, hyphens, and underscores');
    }

    // Set defaults
    const normalized = {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author || 'Unknown',
      license: manifest.license || 'MIT',
      repository: manifest.repository || null,
      homepage: manifest.homepage || null,
      keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
      
      // Claude Code specific
      claudeCode: manifest.claudeCode || {},
      
      // Package structure
      structure: this.normalizeStructure(manifest.structure || {}),
      
      // Installation variants
      variants: this.normalizeVariants(manifest.variants || {}),
      
      // Dependencies
      dependencies: this.normalizeDependencies(manifest.dependencies || {}),
      
      // Lifecycle hooks
      hooks: this.normalizeHooks(manifest.hooks || {}),
      
      // Files to exclude
      ignore: Array.isArray(manifest.ignore) ? manifest.ignore : ['node_modules', '.git', '.DS_Store']
    };

    return normalized;
  }

  /**
   * Validate a complete manifest
   */
  validate(manifest) {
    // Basic structure validation
    this.validateStructure(manifest);
    
    // Validate variants
    this.validateVariants(manifest.variants);
    
    // Validate dependencies
    this.validateDependencies(manifest.dependencies);
    
    // Validate hooks
    this.validateHooks(manifest.hooks);
    
    return true;
  }

  // Private normalization methods

  normalizeStructure(structure) {
    const normalized = {};
    
    // Support both array and object format
    for (const [key, value] of Object.entries(structure)) {
      if (Array.isArray(value)) {
        normalized[key] = value.map(item => this.normalizeStructureItem(item));
      } else {
        normalized[key] = [this.normalizeStructureItem(value)];
      }
    }
    
    return normalized;
  }

  normalizeStructureItem(item) {
    if (typeof item === 'string') {
      // Simple string format: "source/path"
      return {
        source: item,
        dest: item
      };
    }
    
    if (typeof item === 'object') {
      return {
        source: item.source || item.from,
        dest: item.dest || item.to || item.destination,
        pattern: item.pattern || '**/*',
        exclude: Array.isArray(item.exclude) ? item.exclude : []
      };
    }
    
    throw new ValidationError(`Invalid structure item: ${JSON.stringify(item)}`);
  }

  normalizeVariants(variants) {
    if (Object.keys(variants).length === 0) {
      // Create a default variant if none specified
      return {
        default: {
          description: 'Default installation',
          include: ['**/*']
        }
      };
    }

    const normalized = {};
    
    for (const [name, variant] of Object.entries(variants)) {
      if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        throw new ValidationError(`Invalid variant name: ${name}. Must start with letter and contain only lowercase letters, numbers, and hyphens.`);
      }
      
      normalized[name] = {
        description: variant.description || `${name} variant`,
        include: Array.isArray(variant.include) ? variant.include : ['**/*'],
        exclude: Array.isArray(variant.exclude) ? variant.exclude : []
      };
    }
    
    return normalized;
  }

  normalizeDependencies(dependencies) {
    const normalized = {};
    
    // System dependencies (git, node, etc.)
    if (dependencies.system) {
      normalized.system = Array.isArray(dependencies.system) 
        ? dependencies.system.map(dep => this.normalizeSystemDep(dep))
        : [this.normalizeSystemDep(dependencies.system)];
    }
    
    // PRISM package dependencies
    if (dependencies.prism) {
      normalized.prism = {};
      for (const [name, version] of Object.entries(dependencies.prism)) {
        if (!semver.validRange(version)) {
          throw new ValidationError(`Invalid version range for dependency ${name}: ${version}`);
        }
        normalized.prism[name] = version;
      }
    }
    
    return normalized;
  }

  normalizeSystemDep(dep) {
    if (typeof dep === 'string') {
      return {
        name: dep,
        required: true,
        version: null,
        install: null
      };
    }
    
    if (typeof dep === 'object') {
      return {
        name: dep.name,
        required: dep.required !== false,
        version: dep.version || null,
        install: dep.install || null
      };
    }
    
    throw new ValidationError(`Invalid system dependency: ${JSON.stringify(dep)}`);
  }

  normalizeHooks(hooks) {
    const validHooks = ['preInstall', 'postInstall', 'preUninstall', 'postUninstall', 'preUpdate', 'postUpdate'];
    const normalized = {};
    
    for (const [hook, script] of Object.entries(hooks)) {
      if (!validHooks.includes(hook)) {
        throw new ValidationError(`Unknown hook: ${hook}. Valid hooks are: ${validHooks.join(', ')}`);
      }
      
      if (typeof script !== 'string') {
        throw new ValidationError(`Hook ${hook} must be a string script`);
      }
      
      normalized[hook] = script;
    }
    
    return normalized;
  }

  // Private validation methods

  validateStructure(manifest) {
    if (!manifest.structure || Object.keys(manifest.structure).length === 0) {
      throw new ValidationError('Package must define file structure');
    }

    const validTypes = ['commands', 'scripts', 'rules', 'data', 'templates', 'agents', 'documentation', 'claude_config'];
    
    for (const [type, items] of Object.entries(manifest.structure)) {
      if (!validTypes.includes(type)) {
        throw new ValidationError(`Invalid structure type: ${type}. Valid types: ${validTypes.join(', ')}`);
      }
      
      for (const item of items) {
        if (!item.source || !item.dest) {
          throw new ValidationError(`Structure item missing source or dest: ${JSON.stringify(item)}`);
        }
      }
    }
  }

  validateVariants(variants) {
    if (!variants || Object.keys(variants).length === 0) {
      return; // Default variant will be created
    }
    
    // Validate variant names and structures
    const recommendedVariants = ['minimal', 'standard', 'full'];
    for (const [name, variant] of Object.entries(variants)) {
      if (!variant.description) {
        throw new ValidationError(`Variant ${name} missing description`);
      }
      
      if (!Array.isArray(variant.include) || variant.include.length === 0) {
        throw new ValidationError(`Variant ${name} must specify include patterns`);
      }
    }
    
    // Warn about missing recommended variants
    const hasRecommended = recommendedVariants.some(v => variants[v]);
    if (!hasRecommended) {
      // This is just a warning, not an error
      console.warn(`Consider adding recommended variants: ${recommendedVariants.join(', ')}`);
    }
  }

  validateDependencies(deps) {
    if (!deps) {
      return; // No dependencies to validate
    }
    
    if (deps.system) {
      for (const dep of deps.system) {
        if (!dep.name) {
          throw new ValidationError('System dependency missing name');
        }
        
        if (dep.version && !semver.validRange(dep.version)) {
          throw new ValidationError(`Invalid version range for ${dep.name}: ${dep.version}`);
        }
      }
    }
    
    if (deps.prism) {
      for (const [name, version] of Object.entries(deps.prism)) {
        if (!name || typeof name !== 'string') {
          throw new ValidationError('PRISM dependency name must be a non-empty string');
        }
        
        if (!semver.validRange(version)) {
          throw new ValidationError(`Invalid version range for ${name}: ${version}`);
        }
      }
    }
  }

  validateHooks(hooks) {
    if (!hooks) {
      return; // No hooks to validate
    }
    
    for (const [name, script] of Object.entries(hooks)) {
      if (!script || typeof script !== 'string') {
        throw new ValidationError(`Hook ${name} must be a non-empty string`);
      }
      
      // Basic shell script validation
      if (script.includes('rm -rf /')) {
        throw new ValidationError(`Hook ${name} contains dangerous command: rm -rf /`);
      }
    }
  }

  /**
   * Resolve a variant from manifest
   */
  resolveVariant(manifest, variantName) {
    if (!manifest.variants || Object.keys(manifest.variants).length === 0) {
      return {
        description: 'Default installation',
        include: ['**/*'],
        exclude: []
      };
    }
    
    const variant = manifest.variants[variantName];
    if (variant) {
      return variant;
    }
    
    // Return first variant as default
    const firstVariantName = Object.keys(manifest.variants)[0];
    return manifest.variants[firstVariantName];
  }

  /**
   * Create a template manifest for new packages
   */
  createTemplate(options = {}) {
    const template = {
      name: options.name || 'my-extension',
      version: options.version || '1.0.0',
      description: options.description || 'My Claude Code extension',
      author: options.author || 'Your Name',
      license: options.license || 'MIT',
      repository: options.repository || 'github.com/user/repo',
      
      claudeCode: {
        minVersion: '1.0.0'
      },
      
      structure: {
        commands: [
          {
            source: 'commands/',
            dest: '.claude/commands/{name}/'
          }
        ]
      },
      
      variants: {
        minimal: {
          description: 'Core functionality only',
          include: ['commands/core/*']
        },
        standard: {
          description: 'Recommended features',
          include: ['commands/*', 'scripts/*']
        },
        full: {
          description: 'All features including experimental',
          include: ['**/*']
        }
      },
      
      dependencies: {
        system: [
          {
            name: 'git',
            required: true
          }
        ]
      },
      
      hooks: {
        postInstall: `echo "✅ ${options.name || 'Extension'} installed successfully!"`
      }
    };
    
    return YAML.stringify(template, {
      indent: 2,
      lineWidth: -1
    });
  }
}

export default ManifestParser;