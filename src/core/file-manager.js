const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const tar = require('tar');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

const logger = require('../utils/logger');
const { PrismError } = require('../utils/errors');

class FileManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Install files from package to project
   */
  async installFiles(packagePath, manifest, variant) {
    logger.info(`📁 Installing files for variant: ${variant}`);

    const variantConfig = manifest.variants[variant];
    if (!variantConfig) {
      throw new PrismError(`Variant "${variant}" not found in package`);
    }

    // Process each structure type (commands, scripts, rules, etc.)
    for (const [structureType, items] of Object.entries(manifest.structure)) {
      for (const item of items) {
        await this.installStructureItem(packagePath, item, variantConfig, manifest.name);
      }
    }
  }

  /**
   * Install a single structure item
   */
  async installStructureItem(packagePath, item, variantConfig, packageName) {
    const sourcePath = path.join(packagePath, item.source);
    
    // Resolve destination path (replace {name} placeholder)
    const destPath = path.join(this.projectRoot, item.dest.replace('{name}', packageName));
    
    // Check if source exists
    if (!await fs.pathExists(sourcePath)) {
      logger.warn(`⚠️  Source path not found, skipping: ${sourcePath}`);
      return;
    }

    // Find files matching the pattern
    const pattern = item.pattern || '**/*';
    const files = await glob(pattern, {
      cwd: sourcePath,
      nodir: true,
      ignore: item.exclude || []
    });

    // Filter files based on variant include/exclude patterns
    const includedFiles = this.filterFilesByVariant(files, variantConfig, item.source);

    logger.debug(`Installing ${includedFiles.length} files from ${item.source} to ${item.dest}`);

    // Copy each file
    for (const file of includedFiles) {
      const sourceFile = path.join(sourcePath, file);
      const destFile = path.join(destPath, file);
      
      await fs.ensureDir(path.dirname(destFile));
      await fs.copy(sourceFile, destFile);
      
      logger.debug(`  ✓ ${file}`);
    }

    if (includedFiles.length > 0) {
      logger.step(`Installed ${includedFiles.length} files to ${logger.path(destPath)}`);
    }
  }

  /**
   * Filter files based on variant include/exclude patterns
   */
  filterFilesByVariant(files, variantConfig, basePath) {
    const includePatterns = variantConfig.include || ['**/*'];
    const excludePatterns = variantConfig.exclude || [];

    return files.filter(file => {
      const relativeFile = path.join(basePath, file);
      
      // Check include patterns
      const included = includePatterns.some(pattern => 
        this.matchesPattern(relativeFile, pattern)
      );
      
      if (!included) return false;
      
      // Check exclude patterns
      const excluded = excludePatterns.some(pattern => 
        this.matchesPattern(relativeFile, pattern)
      );
      
      return !excluded;
    });
  }

  /**
   * Simple glob pattern matching
   */
  matchesPattern(filePath, pattern) {
    // Convert glob pattern to regex (simplified)
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Remove package files
   */
  async removePackageFiles(packageName, packageInfo) {
    logger.info(`🗑️  Removing files for package: ${packageName}`);

    if (!packageInfo.files) {
      logger.warn('⚠️  No file list found for package, cannot remove files cleanly');
      return;
    }

    let removedCount = 0;
    
    for (const filePath of packageInfo.files) {
      const fullPath = path.join(this.projectRoot, filePath);
      
      if (await fs.pathExists(fullPath)) {
        await fs.remove(fullPath);
        removedCount++;
        logger.debug(`  ✓ Removed ${filePath}`);
      }
    }

    // Remove empty directories
    await this.removeEmptyDirectories(packageInfo.directories || []);

    logger.step(`Removed ${removedCount} files`);
  }

  /**
   * Remove empty directories
   */
  async removeEmptyDirectories(directories) {
    for (const dir of directories) {
      const fullPath = path.join(this.projectRoot, dir);
      
      try {
        if (await fs.pathExists(fullPath)) {
          const contents = await fs.readdir(fullPath);
          if (contents.length === 0) {
            await fs.rmdir(fullPath);
            logger.debug(`  ✓ Removed empty directory: ${dir}`);
          }
        }
      } catch (error) {
        // Ignore errors when removing directories
        logger.debug(`Could not remove directory ${dir}: ${error.message}`);
      }
    }
  }

  /**
   * Download and extract package
   */
  async downloadPackage(packageInfo) {
    const cacheDir = path.join(this.projectRoot, '.prism', 'cache');
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

  /**
   * Download from GitHub
   */
  async downloadFromGithub(repo, cacheDir) {
    const [owner, repoName] = repo.split('/');
    const archiveUrl = `https://github.com/${repo}/archive/refs/heads/main.tar.gz`;
    const fileName = `${owner}-${repoName}-main.tar.gz`;
    const filePath = path.join(cacheDir, fileName);
    const extractDir = path.join(cacheDir, `${owner}-${repoName}-main`);

    logger.step(`Downloading from GitHub: ${repo}`);

    try {
      // Download if not cached
      if (!await fs.pathExists(filePath)) {
        const response = await fetch(archiveUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(filePath, buffer);
      }

      // Extract if not already extracted
      if (!await fs.pathExists(extractDir)) {
        await tar.extract({
          file: filePath,
          cwd: cacheDir
        });
      }

      return extractDir;
    } catch (error) {
      throw new PrismError(`Failed to download from GitHub: ${error.message}`);
    }
  }

  /**
   * Download from GitLab
   */
  async downloadFromGitlab(repo, cacheDir) {
    const [owner, repoName] = repo.split('/');
    const archiveUrl = `https://gitlab.com/${repo}/-/archive/main/${repoName}-main.tar.gz`;
    const fileName = `${owner}-${repoName}-main.tar.gz`;
    const filePath = path.join(cacheDir, fileName);
    const extractDir = path.join(cacheDir, `${repoName}-main`);

    logger.step(`Downloading from GitLab: ${repo}`);

    try {
      // Download if not cached
      if (!await fs.pathExists(filePath)) {
        const response = await fetch(archiveUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(filePath, buffer);
      }

      // Extract if not already extracted
      if (!await fs.pathExists(extractDir)) {
        await tar.extract({
          file: filePath,
          cwd: cacheDir
        });
      }

      return extractDir;
    } catch (error) {
      throw new PrismError(`Failed to download from GitLab: ${error.message}`);
    }
  }

  /**
   * Download from Git URL
   */
  async downloadFromGit(url, cacheDir) {
    const repoName = path.basename(url, '.git');
    const cloneDir = path.join(cacheDir, repoName);

    logger.step(`Cloning from Git: ${url}`);

    try {
      if (!await fs.pathExists(cloneDir)) {
        execSync(`git clone "${url}" "${cloneDir}"`, { stdio: 'inherit' });
      } else {
        // Update existing clone
        execSync('git pull origin main', { cwd: cloneDir, stdio: 'inherit' });
      }

      return cloneDir;
    } catch (error) {
      throw new PrismError(`Failed to clone from Git: ${error.message}`);
    }
  }

  /**
   * Create package archive
   */
  async createPackage(sourceDir, outputPath, manifest) {
    logger.info(`📦 Creating package: ${path.basename(outputPath)}`);

    const files = await this.collectPackageFiles(sourceDir, manifest);
    
    await tar.create(
      {
        gzip: true,
        file: outputPath,
        cwd: sourceDir
      },
      files
    );

    const stats = await fs.stat(outputPath);
    logger.success(`✅ Package created: ${logger.path(outputPath)} (${this.formatSize(stats.size)})`);

    return outputPath;
  }

  /**
   * Collect files to include in package
   */
  async collectPackageFiles(sourceDir, manifest) {
    const allFiles = new Set();

    // Include manifest file
    allFiles.add('prism-package.yaml');

    // Include files based on structure definition
    for (const [structureType, items] of Object.entries(manifest.structure)) {
      for (const item of items) {
        const files = await glob(item.pattern || '**/*', {
          cwd: path.join(sourceDir, item.source),
          nodir: true,
          ignore: [...(item.exclude || []), ...manifest.ignore]
        });

        files.forEach(file => {
          allFiles.add(path.join(item.source, file));
        });
      }
    }

    // Include additional files (README, LICENSE, etc.)
    const additionalFiles = ['README.md', 'LICENSE', 'CHANGELOG.md'];
    for (const file of additionalFiles) {
      if (await fs.pathExists(path.join(sourceDir, file))) {
        allFiles.add(file);
      }
    }

    return Array.from(allFiles);
  }

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  }

  /**
   * Validate package structure
   */
  async validatePackageStructure(packageDir, manifest) {
    const errors = [];

    // Check that all source paths exist
    for (const [structureType, items] of Object.entries(manifest.structure)) {
      for (const item of items) {
        const sourcePath = path.join(packageDir, item.source);
        if (!await fs.pathExists(sourcePath)) {
          errors.push(`Source path does not exist: ${item.source}`);
        }
      }
    }

    // Check for required files
    const manifestPath = path.join(packageDir, 'prism-package.yaml');
    if (!await fs.pathExists(manifestPath)) {
      errors.push('Missing prism-package.yaml file');
    }

    if (errors.length > 0) {
      throw new PrismError(`Package validation failed:\n${errors.join('\n')}`);
    }
  }
}

module.exports = FileManager;