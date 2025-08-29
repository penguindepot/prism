const inquirer = require('inquirer');
const PackageManager = require('../core/package-manager');
const logger = require('../utils/logger');

async function uninstall(packageName, options) {
  try {
    const packageManager = new PackageManager();
    
    if (!packageName) {
      logger.error('❌ Package name required');
      logger.info('Usage: prism uninstall <package>');
      logger.info('');
      logger.info('Examples:');
      logger.info('  prism uninstall cccc');
      logger.info('  prism uninstall my-extension');
      process.exit(1);
    }

    logger.title(`Uninstalling ${logger.package(packageName)}`);

    // Check if package is installed
    const config = await packageManager.getConfig();
    const packageInfo = config.packages[packageName];
    
    if (!packageInfo) {
      logger.error(`❌ Package "${packageName}" is not installed`);
      logger.info('💡 Run "prism list" to see installed packages');
      process.exit(1);
    }

    // Show package information
    logger.info(`📦 Package: ${logger.package(packageName, packageInfo.version)}`);
    logger.info(`📅 Installed: ${new Date(packageInfo.installed).toLocaleString()}`);
    if (packageInfo.variant) {
      logger.info(`🎛️  Variant: ${packageInfo.variant}`);
    }
    logger.info('');

    // Confirm uninstallation unless --yes flag is provided
    if (!options.yes) {
      const { confirmUninstall } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmUninstall',
          message: `Are you sure you want to uninstall ${packageName}?`,
          default: false
        }
      ]);

      if (!confirmUninstall) {
        logger.info('❌ Uninstallation cancelled');
        process.exit(0);
      }
    }

    // Ask about keeping data files
    let keepData = options.keepData;
    if (!keepData && !options.yes) {
      const { keepDataFiles } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'keepDataFiles',
          message: 'Keep package data files (e.g., configuration, templates)?',
          default: true
        }
      ]);
      keepData = keepDataFiles;
    }

    const spinner = logger.spinner('Removing package files...');
    spinner.start();

    try {
      await packageManager.uninstallPackage(packageName, {
        keepData: keepData
      });

      spinner.succeed('Package uninstalled successfully');

      logger.success(`✅ ${packageName} has been uninstalled`);
      
      if (keepData) {
        logger.info('📁 Package data files were preserved');
      }

    } catch (error) {
      spinner.fail('Uninstallation failed');
      throw error;
    }

  } catch (error) {
    logger.error('❌ Uninstallation failed:', error.message);
    
    if (error.code === 'PRISM_ERROR') {
      logger.info('💡 Make sure the package exists and try again');
    }
    
    if (options.verbose) {
      logger.error(error.stack);
    }
    
    process.exit(1);
  }
}

module.exports = uninstall;