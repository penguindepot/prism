import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import semver from 'semver';
import fetch from 'node-fetch';

import ManifestParser from './manifest-parser.js';
import FileManager from './file-manager.js';
import { PrismError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

class PackageManager {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.prismDir = path.join(projectRoot, '.prism');
    this.configPath = path.join(this.prismDir, 'config.json');
    this.claudeDir = path.join(projectRoot, '.claude');
    
    this.manifestParser = new ManifestParser();
    this.fileManager = new FileManager(projectRoot);
    
    // Ensure PRISM directories exist
    this.ensurePrismStructure();
  }

  /**
   * Initialize PRISM in a project
   */
  async initialize(options = {}) {
    logger.info('🚀 Initializing PRISM...');

    try {
      // Check if already initialized
      if (await this.isInitialized() && !options.force) {
        throw new PrismError('PRISM already initialized. Use --force to reinitialize.');
      }

      // Create directory structure
      await this.ensurePrismStructure();
      await this.ensureClaudeStructure();

      // Preserve existing packages if force re-initializing
      let existingPackages = {};
      if (options.force && await fs.pathExists(this.configPath)) {
        try {
          const existingConfig = await fs.readJson(this.configPath);
          existingPackages = existingConfig.packages || {};
        } catch (error) {
          // Ignore errors reading existing config
        }
      }

      // Create initial config
      const config = {
        version: '1.0.0',
        packages: existingPackages,
        registry: process.env.PRISM_REGISTRY || 'https://registry.prism-claude.io',
        config: {
          defaultVariant: 'standard',
          autoUpdate: false,
          verbose: false,
          confirmUninstall: true,
          keepBackups: true
        },
        initialized: new Date().toISOString()
      };

      await fs.writeJson(this.configPath, config, { spaces: 2 });

      logger.success('✅ PRISM initialized successfully!');
      logger.info('📁 Created .prism/ directory');
      logger.info('📁 Created .claude/ directory structure');
      logger.info('📝 Run "prism install <package>" to install extensions');

      return config;
    } catch (error) {
      logger.error('❌ Failed to initialize PRISM:', error.message);
      throw error;
    }
  }

  /**
   * Install a package
   */
  async installPackage(packageSpec, options = {}) {
    logger.info(`📦 Installing ${packageSpec}...`);

    try {
      // Parse package specification
      const packageInfo = this.parsePackageSpec(packageSpec);
      
      // Fetch package manifest
      const manifest = await this.fetchManifest(packageInfo);
      
      // Validate manifest
      this.manifestParser.validate(manifest);
      
      // Check dependencies
      await this.checkDependencies(manifest);
      
      // Select variant
      const variant = options.variant || await this.selectVariant(manifest);
      
      // Check for conflicts
      await this.checkConflicts(manifest, variant);
      
      if (options.dryRun) {
        logger.info('🔍 Dry run - would install:');
        this.showInstallPlan(manifest, variant);
        return;
      }
      
      // Download and extract package
      const packagePath = await this.downloadPackage(packageInfo);
      
      // Install files based on variant
      await this.installFiles(packagePath, manifest, variant);
      
      // Run post-install hooks
      await this.runHooks(manifest, 'postInstall', { variant });
      
      // Update config
      await this.updateConfig(manifest, variant, packageInfo);
      
      logger.success(`✅ ${manifest.name}@${manifest.version} installed successfully!`);
      
      return manifest;
    } catch (error) {
      logger.error(`❌ Failed to install ${packageSpec}:`, error.message);
      throw error;
    }
  }

  /**
   * Uninstall a package
   */
  async uninstallPackage(packageName, options = {}) {
    logger.info(`🗑️  Uninstalling ${packageName}...`);

    try {
      const config = await this.getConfig();
      const packageInfo = config.packages[packageName];
      
      if (!packageInfo) {
        throw new PrismError(`Package "${packageName}" is not installed`);
      }

      // Run pre-uninstall hooks
      if (packageInfo.manifest && packageInfo.manifest.hooks) {
        await this.runHooks(packageInfo.manifest, 'preUninstall');
      }

      // Remove installed files
      await this.removePackageFiles(packageName, packageInfo);

      // Remove from config
      delete config.packages[packageName];
      await fs.writeJson(this.configPath, config, { spaces: 2 });

      logger.success(`✅ ${packageName} uninstalled successfully!`);
      
    } catch (error) {
      logger.error(`❌ Failed to uninstall ${packageName}:`, error.message);
      throw error;
    }
  }

  /**
   * List installed packages
   */
  async listPackages(options = {}) {
    const config = await this.getConfig();
    const packages = Object.entries(config.packages);

    if (packages.length === 0) {
      logger.info('📦 No packages installed');
      return [];
    }

    logger.info('📦 Installed packages:');
    
    for (const [name, info] of packages) {
      const status = options.outdated ? await this.checkForUpdates(name, info) : null;
      const outdatedFlag = status && status.hasUpdate ? chalk.yellow(' (outdated)') : '';
      
      logger.info(`  ${chalk.cyan(name)}@${info.version}${outdatedFlag}`);
      if (info.variant) {
        logger.info(`    variant: ${chalk.gray(info.variant)}`);
      }
      if (info.installed) {
        logger.info(`    installed: ${chalk.gray(new Date(info.installed).toLocaleString())}`);
      }
    }

    return packages;
  }

  /**
   * Update a package or all packages
   */
  async updatePackage(packageName, options = {}) {
    if (options.all || !packageName) {
      return this.updateAllPackages(options);
    }

    logger.info(`🔄 Updating ${packageName}...`);

    try {
      const config = await this.getConfig();
      const packageInfo = config.packages[packageName];
      
      if (!packageInfo) {
        throw new PrismError(`Package "${packageName}" is not installed`);
      }

      // Check for updates
      const updateInfo = await this.checkForUpdates(packageName, packageInfo);
      
      if (!updateInfo.hasUpdate) {
        logger.info(`✅ ${packageName} is already up to date (${packageInfo.version})`);
        return;
      }

      if (options.checkOnly) {
        logger.info(`📋 Update available: ${packageName} ${packageInfo.version} → ${updateInfo.latestVersion}`);
        return;
      }

      // Install the latest version
      await this.installPackage(`${packageInfo.source}@${updateInfo.latestVersion}`, {
        variant: packageInfo.variant
      });

      logger.success(`✅ Updated ${packageName} from ${packageInfo.version} to ${updateInfo.latestVersion}`);
      
    } catch (error) {
      logger.error(`❌ Failed to update ${packageName}:`, error.message);
      throw error;
    }
  }

  // Private helper methods

  async isInitialized() {
    return fs.pathExists(this.configPath);
  }

  async ensurePrismStructure() {
    await fs.ensureDir(this.prismDir);
    await fs.ensureDir(path.join(this.prismDir, 'cache'));
    await fs.ensureDir(path.join(this.prismDir, 'installed'));
  }

  async ensureClaudeStructure() {
    await fs.ensureDir(path.join(this.claudeDir, 'commands'));
    await fs.ensureDir(path.join(this.claudeDir, 'scripts'));
    await fs.ensureDir(path.join(this.claudeDir, 'rules'));
  }

  async getConfig() {
    if (!await this.isInitialized()) {
      throw new PrismError('PRISM not initialized. Run "prism init" first.');
    }
    return fs.readJson(this.configPath);
  }

  parsePackageSpec(spec) {
    // Handle different package specifications:
    // - package-name
    // - github:user/repo
    // - gitlab:user/repo
    // - https://github.com/user/repo.git
    // - ./local/path
    // - package-name@version

    if (spec.startsWith('./') || spec.startsWith('../') || path.isAbsolute(spec)) {
      return { type: 'local', path: spec };
    }

    if (spec.startsWith('http://') || spec.startsWith('https://')) {
      return { type: 'git', url: spec };
    }

    if (spec.includes(':')) {
      const [platform, repo] = spec.split(':', 2);
      if (platform === 'github') {
        return { type: 'github', repo };
      }
      if (platform === 'gitlab') {
        return { type: 'gitlab', repo };
      }
    }

    // Parse version specifier
    const parts = spec.split('@');
    const name = parts[0];
    const version = parts[1] || 'latest';

    return { type: 'registry', name, version };
  }

  async fetchManifest(packageInfo) {
    // Implementation depends on package source type
    switch (packageInfo.type) {
      case 'local':
        return this.fetchLocalManifest(packageInfo.path);
      case 'github':
        return this.fetchGithubManifest(packageInfo.repo);
      case 'gitlab':
        return this.fetchGitlabManifest(packageInfo.repo);
      case 'git':
        return this.fetchGitManifest(packageInfo.url);
      case 'registry':
        return this.fetchRegistryManifest(packageInfo.name, packageInfo.version);
      default:
        throw new PrismError(`Unsupported package type: ${packageInfo.type}`);
    }
  }

  async fetchLocalManifest(localPath) {
    const manifestPath = path.join(localPath, 'prism-package.yaml');
    if (!await fs.pathExists(manifestPath)) {
      throw new ValidationError(`No prism-package.yaml found in ${localPath}`);
    }
    return this.manifestParser.parse(manifestPath);
  }

  async fetchGithubManifest(repo) {
    // Fetch manifest from GitHub raw URL
    const manifestUrl = `https://raw.githubusercontent.com/${repo}/main/prism-package.yaml`;
    const response = await fetch(manifestUrl);
    
    if (!response.ok) {
      throw new PrismError(`Failed to fetch manifest from GitHub: ${response.statusText}`);
    }
    
    const yamlContent = await response.text();
    return this.manifestParser.parseYaml(yamlContent);
  }

  async selectVariant(manifest) {
    if (!manifest.variants || Object.keys(manifest.variants).length <= 1) {
      return 'default';
    }

    // For now, return 'standard' if available, otherwise the first variant
    const variants = Object.keys(manifest.variants);
    return variants.includes('standard') ? 'standard' : variants[0];
  }

  async checkDependencies(manifest) {
    if (!manifest.dependencies) return;

    // Check system dependencies
    if (manifest.dependencies.system) {
      for (const dep of manifest.dependencies.system) {
        await this.checkSystemDependency(dep);
      }
    }
  }

  async checkSystemDependency(dep) {
    const depName = typeof dep === 'string' ? dep : dep.name;
    const required = typeof dep === 'object' ? dep.required !== false : true;

    try {
      execSync(`which ${depName}`, { stdio: 'ignore' });
    } catch (error) {
      if (required) {
        throw new PrismError(`Required system dependency missing: ${depName}`);
      } else {
        logger.warn(`⚠️  Optional dependency missing: ${depName}`);
      }
    }
  }

  async checkConflicts(manifest, variant) {
    const config = await this.getConfig();
    
    // Check if package is already installed
    if (config.packages[manifest.name]) {
      const installed = config.packages[manifest.name];
      if (semver.eq(installed.version, manifest.version)) {
        throw new PrismError(`${manifest.name}@${manifest.version} is already installed`);
      }
      logger.warn(`⚠️  ${manifest.name}@${installed.version} is already installed. This will upgrade to ${manifest.version}.`);
    }
  }

  showInstallPlan(manifest, variant) {
    logger.info(`📋 Package: ${chalk.cyan(manifest.name)}@${manifest.version}`);
    logger.info(`📋 Variant: ${chalk.yellow(variant)}`);
    logger.info(`📋 Description: ${manifest.description}`);
    
    if (manifest.structure) {
      logger.info(`📋 Files to install:`);
      for (const [type, files] of Object.entries(manifest.structure)) {
        logger.info(`   ${type}: ${files.length} file(s)`);
      }
    }
  }

  async runHooks(manifest, hookName, context = {}) {
    const hooks = manifest.hooks;
    if (!hooks || !hooks[hookName]) return;

    const hookScript = hooks[hookName];
    logger.info(`🪝 Running ${hookName} hook...`);

    try {
      // Set environment variables for the hook
      const env = {
        ...process.env,
        PRISM_PACKAGE_NAME: manifest.name,
        PRISM_PACKAGE_VERSION: manifest.version,
        PRISM_VARIANT: context.variant || 'default',
        PRISM_PROJECT_ROOT: this.projectRoot
      };

      execSync(hookScript, { 
        stdio: 'inherit', 
        cwd: this.projectRoot,
        env 
      });
    } catch (error) {
      logger.error(`❌ Hook ${hookName} failed:`, error.message);
      throw error;
    }
  }

  async updateConfig(manifest, variant, packageInfo) {
    const config = await this.getConfig();
    
    config.packages[manifest.name] = {
      name: manifest.name,
      version: manifest.version,
      variant: variant,
      source: packageInfo.type === 'local' ? packageInfo.path : 
              packageInfo.type === 'github' ? `github:${packageInfo.repo}` :
              packageInfo.type === 'gitlab' ? `gitlab:${packageInfo.repo}` :
              packageInfo.name,
      installed: new Date().toISOString(),
      manifest: manifest
    };

    await fs.writeJson(this.configPath, config, { spaces: 2 });
  }

  async updateAllPackages(options) {
    // Implementation for updating all packages
    const config = await this.getConfig();
    const packages = Object.keys(config.packages);
    
    const results = {
      updated: 0,
      upToDate: 0,
      errors: 0
    };

    for (const packageName of packages) {
      try {
        const result = await this.updatePackage(packageName, options);
        if (result && result.updated) {
          results.updated++;
        } else {
          results.upToDate++;
        }
      } catch (error) {
        results.errors++;
      }
    }

    return results;
  }

  async checkForUpdates(packageName, packageInfo) {
    // Placeholder for update checking logic
    // In a real implementation, this would check the package source for newer versions
    return {
      hasUpdate: false,
      latestVersion: packageInfo.version,
      currentVersion: packageInfo.version
    };
  }

  async fetchGitlabManifest(repo) {
    const manifestUrl = `https://gitlab.com/${repo}/-/raw/main/prism-package.yaml`;
    const response = await fetch(manifestUrl);
    
    if (!response.ok) {
      throw new PrismError(`Failed to fetch manifest from GitLab: ${response.statusText}`);
    }
    
    const yamlContent = await response.text();
    return this.manifestParser.parseYaml(yamlContent);
  }

  async fetchGitManifest(url) {
    // For now, just clone and read local manifest
    // In production, this might use Git APIs to fetch the raw file
    const tempDir = await this.downloadFromGit(url, path.join(this.prismDir, 'temp'));
    return this.fetchLocalManifest(tempDir);
  }

  async fetchRegistryManifest(name, version) {
    // Placeholder for registry implementation
    throw new PrismError('Registry packages not yet implemented');
  }

  async downloadPackage(packageInfo) {
    const cacheDir = path.join(this.prismDir, 'cache');
    await fs.ensureDir(cacheDir);

    switch (packageInfo.type) {
      case 'local':
        return packageInfo.path;
      case 'github':
        return this.downloadFromGithub(packageInfo.repo, cacheDir);
      case 'gitlab':
        return this.downloadFromGitlab(packageInfo.repo, cacheDir);
      case 'git':
        return this.downloadFromGit(packageInfo.url, cacheDir);
      default:
        throw new PrismError(`Unsupported package source: ${packageInfo.type}`);
    }
  }

  async installFiles(packagePath, manifest, variant) {
    return this.fileManager.installFiles(packagePath, manifest, variant);
  }

  async removePackageFiles(packageName, packageInfo) {
    return this.fileManager.removePackageFiles(packageName, packageInfo);
  }
}

export default PackageManager;