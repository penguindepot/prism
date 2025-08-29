const PackageManager = require('../core/package-manager');
const logger = require('../utils/logger');

async function init(options) {
  try {
    const packageManager = new PackageManager();
    
    logger.title('Initializing PRISM in your project');
    
    await packageManager.initialize({
      force: options.force
    });
    
    // Show next steps
    logger.box([
      'PRISM has been initialized successfully!',
      '',
      'Next steps:',
      '  • Install extensions: prism install <package>',
      '  • Browse available packages: prism search <query>',
      '  • See installed packages: prism list',
      '',
      'Examples:',
      '  prism install github:penguindepot/cccc',
      '  prism install cccc --variant=minimal'
    ].join('\n'), { color: 'green' });
    
  } catch (error) {
    logger.error('Failed to initialize PRISM:', error.message);
    if (error.code === 'PRISM_ERROR' && !options.force) {
      logger.info('💡 Use --force to reinitialize an existing PRISM project');
    }
    process.exit(1);
  }
}

module.exports = init;