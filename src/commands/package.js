import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ManifestParser from '../core/manifest-parser.js';
import FileManager from '../core/file-manager.js';
import logger from '../utils/logger.js';

async function packageCmd(directory, options = {}) {
  try {
    const sourceDir = directory ? path.resolve(directory) : process.cwd();
    
    logger.title(`Creating Package from ${logger.path(sourceDir)}`);

    // Check if source directory exists
    if (!await fs.pathExists(sourceDir)) {
      logger.error(`❌ Directory not found: ${sourceDir}`);
      throw new Error('Command failed');
    }

    const manifestPath = path.join(sourceDir, 'prism-package.yaml');
    
    // Check for manifest file
    if (!await fs.pathExists(manifestPath)) {
      logger.error('❌ No prism-package.yaml found in directory');
      logger.info('💡 Create a manifest file first:');
      logger.info('   prism create-manifest');
      logger.info('   # or #');
      logger.info('   prism validate --init');
      throw new Error('Command failed');
    }

    const spinner = logger.spinner('Parsing manifest...');
    spinner.start();

    try {
      // Parse and validate manifest
      const manifestParser = new ManifestParser();
      let manifest = await manifestParser.parse(manifestPath);
      
      spinner.succeed('Manifest parsed successfully');
      
      // Show package info
      logger.info('');
      logger.info(`📦 Package: ${logger.package(manifest.name, manifest.version)}`);
      logger.info(`📝 Description: ${manifest.description}`);
      logger.info(`👤 Author: ${manifest.author}`);
      logger.info('');

      // Determine output filename
      const outputFilename = options.output || 
        `${manifest.name}-${manifest.version}.tar.gz`;
      const outputPath = path.resolve(outputFilename);

      // Validate package structure
      const fileManager = new FileManager(sourceDir);
      await fileManager.validatePackageStructure(sourceDir, manifest);

      // Apply command-line exclude/include options to manifest
      if (options.exclude || options.include) {
        const updatedManifest = { ...manifest };
        if (options.exclude) {
          // Add exclude patterns to the manifest ignore list
          updatedManifest.ignore = [...(manifest.ignore || []), options.exclude];
        }
        // Note: include option would require more complex logic to modify structure patterns
        manifest = updatedManifest;
      }

      // Create package
      const packageSpinner = logger.spinner('Creating package archive...');
      packageSpinner.start();

      await fileManager.createPackage(sourceDir, outputPath, manifest);
      
      packageSpinner.succeed('Package created successfully');

      // Show package contents summary
      const files = await fileManager.collectPackageFiles(sourceDir, manifest);
      
      logger.info('');
      logger.info(chalk.bold('Package Contents:'));
      
      // Group files by type
      const filesByType = {};
      files.forEach(file => {
        const dir = path.dirname(file);
        const type = dir.split(path.sep)[0] || 'root';
        if (!filesByType[type]) filesByType[type] = [];
        filesByType[type].push(file);
      });

      Object.entries(filesByType).forEach(([type, typeFiles]) => {
        logger.info(`  ${chalk.yellow(type)}: ${typeFiles.length} file(s)`);
        if (options.verbose) {
          typeFiles.forEach(file => {
            logger.info(`    • ${file}`);
          });
        }
      });

      // Show final summary
      logger.box([
        `Package created: ${path.basename(outputPath)}`,
        `Location: ${outputPath}`,
        `Total files: ${files.length}`,
        '',
        'Next steps:',
        '  • Test installation: prism install ' + outputPath,
        '  • Share with others: distribute the .tar.gz file',
        '  • Publish to registry: prism publish ' + outputPath
      ].join('\n'), { color: 'green' });

      // Resolve symlinks to get canonical path (fixes macOS /var vs /private/var issue)
      const resolvedPath = await fs.realpath(outputPath);
      return resolvedPath;

    } catch (error) {
      spinner.fail('Failed to create package');
      throw error;
    }

  } catch (error) {
    logger.error('❌ Package creation failed:', error.message);
    
    if (error.code === 'VALIDATION_ERROR') {
      logger.info('💡 Fix manifest validation errors and try again');
    } else if (error.code === 'ENOENT') {
      logger.info('💡 Make sure all referenced files exist');
    }
    
    if (options && options.verbose) {
      logger.error(error.stack);
    }
    
    // For tests, preserve the original error message
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
    
    throw new Error('Command failed');
  }
}

export default packageCmd;