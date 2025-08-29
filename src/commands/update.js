const PackageManager = require('../core/package-manager');
const logger = require('../utils/logger');

async function update(packageName, options) {
  try {
    const packageManager = new PackageManager();
    
    if (options.all || !packageName) {
      return updateAllPackages(packageManager, options);
    }
    
    return updateSinglePackage(packageManager, packageName, options);

  } catch (error) {
    logger.error('❌ Update failed:', error.message);
    
    if (error.code === 'NETWORK_ERROR') {
      logger.info('💡 Check your internet connection and try again');
    } else if (error.code === 'PRISM_ERROR') {
      logger.info('💡 Make sure the package exists and PRISM is initialized');
    }
    
    if (options.verbose) {
      logger.error(error.stack);
    }
    
    process.exit(1);
  }
}

async function updateSinglePackage(packageManager, packageName, options) {
  logger.title(`Updating ${logger.package(packageName)}`);
  
  if (options.checkOnly) {
    logger.info('🔍 Check-only mode - no changes will be made');
  }

  const spinner = logger.spinner('Checking for updates...');
  spinner.start();

  try {
    await packageManager.updatePackage(packageName, {
      checkOnly: options.checkOnly
    });
    
    spinner.stop();

    if (!options.checkOnly) {
      logger.success(`✅ ${packageName} updated successfully`);
    }

  } catch (error) {
    spinner.fail('Update failed');
    throw error;
  }
}

async function updateAllPackages(packageManager, options) {
  logger.title('Updating All Packages');
  
  if (options.checkOnly) {
    logger.info('🔍 Check-only mode - no changes will be made');
  }

  const spinner = logger.spinner('Loading installed packages...');
  spinner.start();

  try {
    const config = await packageManager.getConfig();
    const packages = Object.keys(config.packages);
    
    spinner.stop();

    if (packages.length === 0) {
      logger.info('📦 No packages installed');
      return;
    }

    logger.info(`📊 Found ${packages.length} installed package(s)`);
    logger.info('');

    let updatedCount = 0;
    let upToDateCount = 0;
    let errorCount = 0;

    // Update each package
    for (const packageName of packages) {
      const updateSpinner = logger.spinner(`Updating ${packageName}...`);
      updateSpinner.start();

      try {
        const result = await packageManager.updatePackage(packageName, {
          checkOnly: options.checkOnly
        });

        if (result && result.updated) {
          updateSpinner.succeed(`${packageName} updated to ${result.newVersion}`);
          updatedCount++;
        } else {
          updateSpinner.succeed(`${packageName} is up-to-date`);
          upToDateCount++;
        }

      } catch (error) {
        updateSpinner.fail(`Failed to update ${packageName}: ${error.message}`);
        errorCount++;
      }
    }

    // Show summary
    logger.info('');
    logger.title('Update Summary');
    
    if (!options.checkOnly) {
      logger.info(`✅ Updated: ${updatedCount} package(s)`);
    }
    logger.info(`📋 Up-to-date: ${upToDateCount} package(s)`);
    
    if (errorCount > 0) {
      logger.warn(`⚠️  Errors: ${errorCount} package(s)`);
    }

    if (options.checkOnly && updatedCount > 0) {
      logger.info('');
      logger.info('💡 Run "prism update --all" to apply updates');
    }

  } catch (error) {
    spinner.fail('Failed to update packages');
    throw error;
  }
}

module.exports = update;