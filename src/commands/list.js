const PackageManager = require('../core/package-manager');
const logger = require('../utils/logger');
const chalk = require('chalk');

async function list(options) {
  try {
    const packageManager = new PackageManager();
    
    logger.title('Installed PRISM Packages');

    const packages = await packageManager.listPackages({
      global: options.global,
      outdated: options.outdated
    });

    if (packages.length === 0) {
      logger.info('📦 No packages installed');
      logger.info('');
      logger.info('💡 Install packages with:');
      logger.info('   prism install <package-name>');
      logger.info('   prism install github:user/repo');
      return;
    }

    // Prepare table data
    const tableData = [];
    
    for (const [name, info] of packages) {
      const row = {
        Name: name,
        Version: info.version,
        Variant: info.variant || 'default',
        Installed: new Date(info.installed).toLocaleDateString(),
        Source: info.source || 'unknown'
      };

      // Add update information if checking for outdated packages
      if (options.outdated) {
        try {
          const updateInfo = await packageManager.checkForUpdates(name, info);
          row.Latest = updateInfo.latestVersion;
          row.Status = updateInfo.hasUpdate ? 
            chalk.yellow('outdated') : 
            chalk.green('up-to-date');
        } catch (error) {
          row.Latest = 'unknown';
          row.Status = chalk.gray('check failed');
        }
      }

      tableData.push(row);
    }

    // Display table
    logger.table(tableData);

    // Show summary
    logger.info('');
    logger.info(`📊 Total: ${chalk.cyan(packages.length)} package(s) installed`);
    
    if (options.outdated) {
      const outdatedCount = tableData.filter(row => 
        typeof row.Status === 'string' && row.Status.includes('outdated')
      ).length;
      
      if (outdatedCount > 0) {
        logger.info(`📋 ${chalk.yellow(outdatedCount)} package(s) have updates available`);
        logger.info('💡 Run "prism update" to update all packages');
      } else {
        logger.info('✅ All packages are up-to-date');
      }
    }

    // Show helpful commands
    logger.info('');
    logger.info('💡 Helpful commands:');
    logger.info('   prism info <package>     - Show package details');
    logger.info('   prism update <package>   - Update a specific package');
    logger.info('   prism update --all       - Update all packages');
    logger.info('   prism uninstall <package> - Remove a package');

  } catch (error) {
    logger.error('❌ Failed to list packages:', error.message);
    
    if (error.code === 'PRISM_ERROR') {
      logger.info('💡 Make sure PRISM is initialized with "prism init"');
    }
    
    if (options.verbose) {
      logger.error(error.stack);
    }
    
    process.exit(1);
  }
}

module.exports = list;