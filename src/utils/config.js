const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configDir = path.join(projectRoot, '.prism');
    this.configPath = path.join(this.configDir, 'config.json');
    this.globalConfigPath = path.join(os.homedir(), '.prism', 'global-config.json');
  }

  async ensureConfig() {
    await fs.ensureDir(this.configDir);
    
    if (!await fs.pathExists(this.configPath)) {
      const defaultConfig = {
        version: '1.0.0',
        registry: process.env.PRISM_REGISTRY || 'https://registry.prism-claude.io',
        packages: {},
        config: {
          autoUpdate: false,
          verbose: false,
          confirmUninstall: true,
          keepBackups: true,
          defaultVariant: 'standard'
        }
      };
      
      await fs.writeJson(this.configPath, defaultConfig, { spaces: 2 });
    }
  }

  async getConfig() {
    await this.ensureConfig();
    return fs.readJson(this.configPath);
  }

  async updateConfig(updates) {
    const config = await this.getConfig();
    Object.assign(config, updates);
    await fs.writeJson(this.configPath, config, { spaces: 2 });
    return config;
  }

  async getGlobalConfig() {
    const globalDir = path.dirname(this.globalConfigPath);
    await fs.ensureDir(globalDir);
    
    if (!await fs.pathExists(this.globalConfigPath)) {
      const defaultGlobalConfig = {
        version: '1.0.0',
        registry: 'https://registry.prism-claude.io',
        cache: {
          enabled: true,
          ttl: 3600000, // 1 hour
          maxSize: '100MB'
        },
        defaults: {
          variant: 'standard',
          verbose: false
        }
      };
      
      await fs.writeJson(this.globalConfigPath, defaultGlobalConfig, { spaces: 2 });
    }
    
    return fs.readJson(this.globalConfigPath);
  }

  async updateGlobalConfig(updates) {
    const config = await this.getGlobalConfig();
    Object.assign(config, updates);
    await fs.writeJson(this.globalConfigPath, config, { spaces: 2 });
    return config;
  }
}

module.exports = ConfigManager;