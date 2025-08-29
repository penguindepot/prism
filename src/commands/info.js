import PackageManager from '../core/package-manager.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

async function info(packageSpec, options) {
  try {
    if (!packageSpec) {
      logger.error('❌ Package name or specification required');
      logger.info('Usage: prism info <package>');
      logger.info('');
      logger.info('Examples:');
      logger.info('  prism info cccc');
      logger.info('  prism info github:user/package');
      process.exit(1);
    }

    const packageManager = new PackageManager();
    
    logger.title(`Package Information: ${logger.package(packageSpec)}`);

    const spinner = logger.spinner('Fetching package information...');
    spinner.start();

    try {
      // Check if it's an installed package first
      const config = await packageManager.getConfig();
      const installedPackage = config.packages[packageSpec];
      
      let manifest;
      let isInstalled = false;
      
      if (installedPackage) {
        // Show installed package info
        manifest = installedPackage.manifest;
        isInstalled = true;
        spinner.succeed('Package information loaded');
      } else {
        // Fetch from remote source
        const packageInfo = packageManager.parsePackageSpec(packageSpec);
        manifest = await packageManager.fetchManifest(packageInfo);
        spinner.succeed('Remote package information loaded');
      }

      // Display basic information
      logger.info('');
      logger.info(`📦 ${chalk.bold(manifest.name)} ${chalk.gray('v' + manifest.version)}`);
      logger.info(`📝 ${manifest.description}`);
      logger.info('');

      // Installation status
      if (isInstalled) {
        logger.info(`${chalk.green('✅ Installed')} (variant: ${installedPackage.variant || 'default'})`);
        logger.info(`📅 Installed on: ${new Date(installedPackage.installed).toLocaleString()}`);
      } else {
        logger.info(`${chalk.yellow('📦 Not installed')}`);
      }
      logger.info('');

      // Package details
      const details = [
        ['Author', manifest.author],
        ['License', manifest.license],
        ['Repository', manifest.repository],
        ['Homepage', manifest.homepage]
      ].filter(([_, value]) => value);

      if (details.length > 0) {
        logger.info(chalk.bold('Package Details:'));
        details.forEach(([label, value]) => {
          logger.info(`  ${label}: ${value}`);
        });
        logger.info('');
      }

      // Keywords
      if (manifest.keywords && manifest.keywords.length > 0) {
        logger.info(`🏷️  Keywords: ${manifest.keywords.join(', ')}`);
        logger.info('');
      }

      // Claude Code compatibility
      if (manifest.claudeCode) {
        logger.info(chalk.bold('Claude Code Compatibility:'));
        if (manifest.claudeCode.minVersion) {
          logger.info(`  Minimum version: ${manifest.claudeCode.minVersion}`);
        }
        if (manifest.claudeCode.maxVersion) {
          logger.info(`  Maximum version: ${manifest.claudeCode.maxVersion}`);
        }
        logger.info('');
      }

      // Installation variants
      if (manifest.variants && Object.keys(manifest.variants).length > 1) {
        logger.info(chalk.bold('Available Variants:'));
        Object.entries(manifest.variants).forEach(([name, variant]) => {
          const marker = isInstalled && installedPackage.variant === name ? 
            chalk.green(' (installed)') : '';
          logger.info(`  ${chalk.cyan(name)}${marker}: ${variant.description}`);
        });
        logger.info('');
      }

      // Package structure
      if (manifest.structure) {
        logger.info(chalk.bold('Package Contents:'));
        Object.entries(manifest.structure).forEach(([type, items]) => {
          logger.info(`  ${chalk.yellow(type)}: ${items.length} item(s)`);
        });
        logger.info('');
      }

      // Dependencies
      if (manifest.dependencies && 
          (manifest.dependencies.system || manifest.dependencies.prism)) {
        logger.info(chalk.bold('Dependencies:'));
        
        if (manifest.dependencies.system) {
          logger.info('  System:');
          manifest.dependencies.system.forEach(dep => {
            const required = dep.required ? '' : ' (optional)';
            logger.info(`    • ${dep.name}${required}`);
          });
        }
        
        if (manifest.dependencies.prism) {
          logger.info('  PRISM packages:');
          Object.entries(manifest.dependencies.prism).forEach(([name, version]) => {
            logger.info(`    • ${name} ${version}`);
          });
        }
        
        logger.info('');
      }

      // Show versions if requested
      if (options.versions) {
        logger.info(chalk.bold('Available Versions:'));
        logger.info('🚧 Version history not yet implemented');
        logger.info('');
      }

      // Installation commands
      if (!isInstalled) {
        logger.box([
          'Installation Commands:',
          '',
          `prism install ${packageSpec}`,
          '',
          'With specific variant:',
          `prism install ${packageSpec} --variant=minimal`,
          '',
          'Dry run (preview only):',
          `prism install ${packageSpec} --dry-run`
        ].join('\n'), { color: 'cyan' });
      } else {
        logger.box([
          'Package Management Commands:',
          '',
          `prism update ${manifest.name}`,
          `prism uninstall ${manifest.name}`,
          '',
          'Reinstall with different variant:',
          `prism uninstall ${manifest.name}`,
          `prism install ${packageSpec} --variant=full`
        ].join('\n'), { color: 'cyan' });
      }

    } catch (error) {
      spinner.fail('Failed to fetch package information');
      throw error;
    }

  } catch (error) {
    logger.error('❌ Failed to get package information:', error.message);
    
    if (error.code === 'NETWORK_ERROR') {
      logger.info('💡 Check your internet connection and package URL');
    } else if (error.code === 'VALIDATION_ERROR') {
      logger.info('💡 The package manifest has validation errors');
    }
    
    if (options.verbose) {
      logger.error(error.stack);
    }
    
    process.exit(1);
  }
}

export default info;