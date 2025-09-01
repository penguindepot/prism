import PackageManager from '../core/package-manager.js';
import logger from '../utils/logger.js';

async function install(packageSpec, options) {
  try {
    const packageManager = new PackageManager();
    
    // If no package specified, show help
    if (!packageSpec) {
      logger.error('❌ Package name required');
      logger.info('Usage: prism install <package>');
      logger.info('');
      logger.info('Examples:');
      logger.info('  prism install cccc');
      logger.info('  prism install github:user/package');
      logger.info('  prism install https://github.com/user/package.git');
      logger.info('  prism install ./local-package');
      process.exit(1);
    }

    logger.title(`Installing ${logger.package(packageSpec)}`);
    
    // Show dry run message if applicable
    if (options && options.dryRun) {
      logger.info('🔍 Dry run mode - no changes will be made');
      logger.info('');
    }

    const spinner = logger.spinner('Preparing installation...');
    spinner.start();

    try {
      const manifest = await packageManager.installPackage(packageSpec, {
        variant: options && options.variant,
        dryRun: options && options.dryRun,
        save: options && options.save,
        global: options && options.global
      });

      spinner.stop();

      if (options && options.dryRun) {
        logger.success('✅ Dry run completed - package would install successfully');
        return;
      }

      // Show installation summary
      logger.box([
        `${manifest.name}@${manifest.version} installed successfully!`,
        '',
        `Description: ${manifest.description}`,
        `Author: ${manifest.author}`,
        manifest.repository ? `Repository: ${manifest.repository}` : '',
        '',
        'Available commands:',
        '  Run /help in Claude Code to see all available commands'
      ].filter(line => line).join('\n'), { color: 'green' });

      // Show post-install information
      if (manifest.hooks && manifest.hooks.postInstall) {
        logger.info('');
        logger.info('📋 Post-install notes:');
      }

    } catch (error) {
      spinner.fail('Installation failed');
      throw error;
    }

  } catch (error) {
    logger.error('❌ Installation failed:', error.message);
    
    if (error.code === 'VALIDATION_ERROR') {
      logger.info('💡 The package manifest has validation errors');
    } else if (error.code === 'NETWORK_ERROR') {
      logger.info('💡 Check your internet connection and try again');
    } else if (error.code === 'DEPENDENCY_ERROR') {
      logger.info('💡 Install missing dependencies and try again');
    } else if (error.code === 'CONFLICT_ERROR') {
      logger.info('💡 Resolve conflicts or use --force to override');
    }
    
    if (options && options.verbose) {
      logger.error(error.stack);
    }
    
    // In test environment, throw the error instead of exiting
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
    
    process.exit(1);
  }
}

export default install;