const chalk = require('chalk');

class Logger {
  constructor() {
    this.verbose = false;
    this.colorEnabled = true;
  }

  setVerbose(verbose) {
    this.verbose = verbose;
  }

  setColor(enabled) {
    this.colorEnabled = enabled;
  }

  info(message, ...args) {
    this.log(message, ...args);
  }

  success(message, ...args) {
    const formattedMessage = this.colorEnabled ? chalk.green(message) : message;
    this.log(formattedMessage, ...args);
  }

  warn(message, ...args) {
    const formattedMessage = this.colorEnabled ? chalk.yellow(message) : message;
    console.warn(formattedMessage, ...args);
  }

  error(message, ...args) {
    const formattedMessage = this.colorEnabled ? chalk.red(message) : message;
    console.error(formattedMessage, ...args);
  }

  debug(message, ...args) {
    if (this.verbose) {
      const formattedMessage = this.colorEnabled ? chalk.gray(`[DEBUG] ${message}`) : `[DEBUG] ${message}`;
      console.log(formattedMessage, ...args);
    }
  }

  log(message, ...args) {
    console.log(message, ...args);
  }

  // Specialized logging methods

  step(message, ...args) {
    const formattedMessage = this.colorEnabled ? chalk.cyan(`→ ${message}`) : `→ ${message}`;
    this.log(formattedMessage, ...args);
  }

  title(message) {
    const line = '═'.repeat(Math.min(message.length, 50));
    this.log('');
    if (this.colorEnabled) {
      this.log(chalk.bold.cyan(line));
      this.log(chalk.bold.cyan(message));
      this.log(chalk.bold.cyan(line));
    } else {
      this.log(line);
      this.log(message);
      this.log(line);
    }
    this.log('');
  }

  table(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    // Simple table formatting
    const headers = Object.keys(data[0]);
    const columnWidths = headers.map(header => 
      Math.max(header.length, ...data.map(row => String(row[header] || '').length))
    );

    // Header
    const headerRow = headers.map((header, i) => 
      header.padEnd(columnWidths[i])
    ).join(' | ');
    
    this.log(this.colorEnabled ? chalk.bold(headerRow) : headerRow);
    this.log(columnWidths.map(width => '-'.repeat(width)).join('-+-'));

    // Rows
    data.forEach(row => {
      const dataRow = headers.map((header, i) => 
        String(row[header] || '').padEnd(columnWidths[i])
      ).join(' | ');
      this.log(dataRow);
    });
  }

  spinner(message) {
    if (typeof require !== 'undefined') {
      try {
        const ora = require('ora');
        return ora(message);
      } catch (e) {
        // ora not available, fallback to simple message
        this.info(message);
        return {
          start: () => {},
          succeed: (msg) => this.success(msg || message),
          fail: (msg) => this.error(msg || message),
          stop: () => {}
        };
      }
    }
  }

  // Progress indication
  progress(current, total, message = '') {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    
    const progressMessage = `[${bar}] ${percent}% ${message}`;
    process.stdout.write(`\r${progressMessage}`);
    
    if (current === total) {
      console.log(''); // New line when complete
    }
  }

  // Box formatting for important messages
  box(message, options = {}) {
    const lines = message.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length));
    const width = Math.min(maxLength + 4, 80);
    
    const border = options.char || '─';
    const topLine = '┌' + border.repeat(width - 2) + '┐';
    const bottomLine = '└' + border.repeat(width - 2) + '┘';
    
    this.log('');
    if (this.colorEnabled && options.color) {
      this.log(chalk[options.color](topLine));
      lines.forEach(line => {
        const padded = `│ ${line.padEnd(width - 4)} │`;
        this.log(chalk[options.color](padded));
      });
      this.log(chalk[options.color](bottomLine));
    } else {
      this.log(topLine);
      lines.forEach(line => {
        this.log(`│ ${line.padEnd(width - 4)} │`);
      });
      this.log(bottomLine);
    }
    this.log('');
  }

  // Format file paths consistently
  path(filePath) {
    return this.colorEnabled ? chalk.cyan(filePath) : filePath;
  }

  // Format package names consistently
  package(name, version = null) {
    const packageName = this.colorEnabled ? chalk.cyan(name) : name;
    return version ? `${packageName}@${version}` : packageName;
  }

  // Format commands consistently
  command(cmd) {
    return this.colorEnabled ? chalk.yellow(cmd) : cmd;
  }
}

// Create and export singleton instance
const logger = new Logger();
module.exports = logger;