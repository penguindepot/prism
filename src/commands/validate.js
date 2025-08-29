import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ManifestParser from '../core/manifest-parser.js';
import FileManager from '../core/file-manager.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

async function validate(directory, options = {}) {
  try {
    const sourceDir = directory ? path.resolve(directory) : process.cwd();
    
    logger.title(`Validating Package at ${logger.path(sourceDir)}`);

    // Check if directory exists
    if (!await fs.pathExists(sourceDir)) {
      logger.error(`❌ Directory not found: ${sourceDir}`);
      throw new Error(`Directory not found: ${sourceDir}`);
    }

    const manifestPath = path.join(sourceDir, 'prism-package.yaml');
    
    // Check for manifest file, offer to create one if missing
    if (!await fs.pathExists(manifestPath)) {
      if (options.init) {
        return createManifestInteractively(sourceDir);
      }
      
      logger.error('❌ No prism-package.yaml found');
      logger.info('💡 Create a manifest with: prism validate --init');
      throw new Error('Manifest file not found');
    }

    // Validation steps
    const validationResults = {
      manifestParsing: false,
      manifestValidation: false,
      fileStructure: false,
      dependencies: false,
      variants: false
    };

    logger.info('🔍 Running validation checks...');
    logger.info('');

    // Step 1: Parse manifest
    const parseSpinner = logger.spinner('Parsing manifest file...');
    parseSpinner.start();

    let manifest;
    try {
      const manifestParser = new ManifestParser();
      manifest = await manifestParser.parse(manifestPath);
      
      parseSpinner.succeed('Manifest parsing: ✅ PASSED');
      validationResults.manifestParsing = true;
    } catch (error) {
      parseSpinner.fail('Manifest parsing: ❌ FAILED');
      logger.error(`  Failed to parse manifest: ${error.message}`);
      
      if (!options.strict) {
        logger.info('  Continuing with remaining checks...');
        manifest = null;
      } else {
        logger.error(`❌ Validation failed: Failed to parse manifest: ${error.message}`);
        throw error;
      }
    }

    // Step 2: Validate manifest structure
    if (manifest) {
      const validationSpinner = logger.spinner('Validating manifest structure...');
      validationSpinner.start();

      try {
        const manifestParser = new ManifestParser();
        manifestParser.validate(manifest);
        
        validationSpinner.succeed('Manifest validation: ✅ PASSED');
        validationResults.manifestValidation = true;
      } catch (error) {
        validationSpinner.fail('Manifest validation: ❌ FAILED');
        logger.error(`  ${error.message}`);
        
        if (options.strict) {
          logger.error(`❌ Validation failed: ${error.message}`);
          throw error;
        }
      }
    }

    // Step 3: Check file structure
    if (manifest) {
      const structureSpinner = logger.spinner('Checking file structure...');
      structureSpinner.start();

      try {
        const fileManager = new FileManager(sourceDir);
        await fileManager.validatePackageStructure(sourceDir, manifest);
        
        structureSpinner.succeed('File structure: ✅ PASSED');
        validationResults.fileStructure = true;
      } catch (error) {
        structureSpinner.fail('File structure: ❌ FAILED');
        logger.error(`  ${error.message}`);
        
        if (options.strict) {
          logger.error(`❌ Validation failed: ${error.message}`);
          throw error;
        }
      }
    }

    // Step 4: Check dependencies
    if (manifest && manifest.dependencies) {
      const depsSpinner = logger.spinner('Checking dependencies...');
      depsSpinner.start();

      try {
        await validateDependencies(manifest.dependencies);
        
        depsSpinner.succeed('Dependencies: ✅ PASSED');
        validationResults.dependencies = true;
      } catch (error) {
        depsSpinner.fail('Dependencies: ❌ FAILED');
        logger.error(`  ${error.message}`);
        
        if (options.strict) {
          throw error;
        }
      }
    } else {
      logger.info('Dependencies: ⏭️  SKIPPED (no dependencies defined)');
      validationResults.dependencies = true;
    }

    // Step 5: Validate variants
    if (manifest && manifest.variants) {
      const variantsSpinner = logger.spinner('Validating variants...');
      variantsSpinner.start();

      try {
        await validateVariants(manifest, sourceDir);
        
        variantsSpinner.succeed('Variants: ✅ PASSED');
        validationResults.variants = true;
      } catch (error) {
        variantsSpinner.fail('Variants: ❌ FAILED');
        logger.error(`  ${error.message}`);
        
        if (options.strict) {
          throw error;
        }
      }
    } else {
      logger.info('Variants: ⏭️  SKIPPED (no variants defined)');
      validationResults.variants = true;
    }

    // Show validation summary
    logger.info('');
    logger.title('Validation Summary');

    const passedCount = Object.values(validationResults).filter(Boolean).length;
    const totalCount = Object.keys(validationResults).length;

    if (passedCount === totalCount) {
      logger.success(`✅ All ${totalCount} validation checks passed!`);
      
      if (manifest) {
        logger.box([
          `Package: ${manifest.name}@${manifest.version}`,
          `Description: ${manifest.description}`,
          `Author: ${manifest.author}`,
          '',
          'Package is ready for distribution!',
          '',
          'Next steps:',
          '  prism package      - Create package archive',
          '  prism publish      - Publish to registry'
        ].join('\n'), { color: 'green' });
      }
    } else {
      logger.warn(`⚠️  ${passedCount}/${totalCount} validation checks passed`);
      
      const failedChecks = Object.entries(validationResults)
        .filter(([_, passed]) => !passed)
        .map(([check, _]) => check);
      
      logger.info(`❌ Failed: ${failedChecks.join(', ')}`);
      logger.info('💡 Fix the issues above and run validation again');

      if (options.strict) {
        throw new Error(`Validation failed: ${failedChecks.join(', ')}`);
      }
    }

    // Show detailed package info if validation passed
    if (manifest && passedCount === totalCount && options.verbose) {
      showDetailedPackageInfo(manifest);
    }

  } catch (error) {
    logger.error('❌ Validation failed:', error.message);
    
    if (options.verbose) {
      logger.error(error.stack);
    }
    
    throw error;
  }
}

async function createManifestInteractively(sourceDir) {
  logger.title('Creating Package Manifest');
  logger.info('Answer the following questions to create your prism-package.yaml file:');
  logger.info('');

  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Package name (lowercase, hyphens allowed):',
      validate: (input) => {
        if (!/^[a-z0-9-_]+$/.test(input)) {
          return 'Name must contain only lowercase letters, numbers, hyphens, and underscores';
        }
        return true;
      },
      default: path.basename(sourceDir).toLowerCase()
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: '1.0.0',
      validate: (input) => {
        if (!/^\d+\.\d+\.\d+/.test(input)) {
          return 'Version must be in semver format (e.g., 1.0.0)';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      validate: (input) => input.trim().length > 0 || 'Description is required'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author:'
    },
    {
      type: 'input',
      name: 'license',
      message: 'License:',
      default: 'MIT'
    },
    {
      type: 'input',
      name: 'repository',
      message: 'Repository URL (optional):'
    },
    {
      type: 'checkbox',
      name: 'variants',
      message: 'Which installation variants do you want?',
      choices: [
        { name: 'Minimal - Core functionality only', value: 'minimal' },
        { name: 'Standard - Recommended features', value: 'standard', checked: true },
        { name: 'Full - All features', value: 'full' }
      ]
    }
  ];

  const answers = await inquirer.prompt(questions);

  // Generate manifest content
  const manifestParser = new ManifestParser();
  const manifestContent = manifestParser.createTemplate({
    name: answers.name,
    version: answers.version,
    description: answers.description,
    author: answers.author,
    license: answers.license,
    repository: answers.repository
  });

  // Write manifest file
  const manifestPath = path.join(sourceDir, 'prism-package.yaml');
  await fs.writeFile(manifestPath, manifestContent);

  logger.success('✅ Manifest created successfully!');
  logger.info(`📄 Created: ${logger.path(manifestPath)}`);
  logger.info('');
  logger.info('💡 Next steps:');
  logger.info('  1. Edit prism-package.yaml to customize your package');
  logger.info('  2. Run "prism validate" to check your configuration');
  logger.info('  3. Run "prism package" to create a distributable archive');
}

async function validateDependencies(dependencies) {
  if (dependencies.system) {
    for (const dep of dependencies.system) {
      // Basic validation - could be enhanced to actually check if tools exist
      if (!dep.name) {
        throw new Error('System dependency missing name');
      }
    }
  }
  
  if (dependencies.prism) {
    for (const [name, version] of Object.entries(dependencies.prism)) {
      if (!name || !version) {
        throw new Error(`Invalid PRISM dependency: ${name}@${version}`);
      }
    }
  }
}

async function validateVariants(manifest, sourceDir) {
  const fileManager = new FileManager(sourceDir);
  
  for (const [variantName, variant] of Object.entries(manifest.variants)) {
    if (!variant.include || variant.include.length === 0) {
      throw new Error(`Variant ${variantName} must specify include patterns`);
    }
    
    // Check if variant patterns match actual files
    let foundFiles = false;
    for (const [structureType, items] of Object.entries(manifest.structure)) {
      for (const item of items) {
        const sourcePath = path.join(sourceDir, item.source);
        if (await fs.pathExists(sourcePath)) {
          const files = await fileManager.collectPackageFiles(sourceDir, manifest);
          const filtered = fileManager.filterFilesByVariant(
            files.map(f => path.basename(f)), 
            variant, 
            item.source
          );
          if (filtered.length > 0) {
            foundFiles = true;
            break;
          }
        }
      }
      if (foundFiles) break;
    }
    
    if (!foundFiles) {
      logger.warn(`⚠️  Variant ${variantName} matches no files`);
    }
  }
}

function showDetailedPackageInfo(manifest) {
  logger.info('');
  logger.title('Detailed Package Information');
  
  // Show structure details
  if (manifest.structure) {
    logger.info(chalk.bold('File Structure:'));
    Object.entries(manifest.structure).forEach(([type, items]) => {
      logger.info(`  ${chalk.yellow(type)}:`);
      items.forEach(item => {
        logger.info(`    ${item.source} → ${item.dest}`);
      });
    });
    logger.info('');
  }
  
  // Show variants details
  if (manifest.variants) {
    logger.info(chalk.bold('Installation Variants:'));
    Object.entries(manifest.variants).forEach(([name, variant]) => {
      logger.info(`  ${chalk.cyan(name)}: ${variant.description}`);
      logger.info(`    Include: ${variant.include.join(', ')}`);
      if (variant.exclude && variant.exclude.length > 0) {
        logger.info(`    Exclude: ${variant.exclude.join(', ')}`);
      }
    });
  }
}

export default validate;