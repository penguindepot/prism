# PRISM 🔮

**Package Registry & Installation System Manager for Claude Code**

PRISM is a package manager specifically designed for Claude Code extensions, making it easy to distribute, install, and manage command packages. Think `npm` for Claude Code commands.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

### Installation

Install PRISM globally via npm:

```bash
npm install -g prism-claude
```

### Initialize a Project

```bash
cd your-project
prism init
```

### Install Extensions

```bash
# Install from GitHub
prism install github:username/my-extension

# Install with specific variant
prism install my-extension --variant=minimal

# Preview installation (dry run)
prism install my-extension --dry-run
```

## 🎯 Features

### 📦 **Easy Package Management**
- Install, update, and remove Claude Code extensions with simple commands
- Support for GitHub, GitLab, and local packages
- Version management with semantic versioning

### 🎛️ **Installation Variants**
- **Minimal**: Core features only
- **Standard**: Recommended feature set
- **Full**: Everything including experimental features

### 🔧 **Package Development Tools**
- Create packages with `prism package`
- Validate with `prism validate`
- Interactive manifest creation

### 🌐 **Multiple Sources**
- GitHub: `prism install github:user/repo`
- GitLab: `prism install gitlab:user/repo`
- Local: `prism install ./local-package`
- URLs: `prism install https://github.com/user/repo.git`

### 🛡️ **Smart Validation**
- Dependency checking
- Conflict detection
- Manifest validation
- File structure verification

## 📋 Commands

### Package Management
```bash
prism init                          # Initialize PRISM in project
prism install <package>             # Install a package
prism uninstall <package>           # Remove a package
prism update [package]              # Update package(s)
prism list                          # List installed packages
prism info <package>                # Show package details
```

### Package Development
```bash
prism validate [directory]          # Validate package structure
prism package [directory]           # Create package archive
prism publish <package>             # Publish to registry (coming soon)
```

### Options
```bash
--variant <name>                    # Specify installation variant
--dry-run                          # Preview without changes
--verbose                          # Detailed output
--force                            # Override conflicts
```

## 📦 Package Format

PRISM packages use a `prism-package.yaml` manifest:

```yaml
name: my-extension
version: 1.0.0
description: My Claude Code extension
author: Your Name
license: MIT

# Claude Code compatibility
claudeCode:
  minVersion: "1.0.0"

# Package structure
structure:
  commands:
    - source: commands/
      dest: .claude/commands/{name}/

# Installation variants
variants:
  minimal:
    description: Core features only
    include: ["commands/core/*"]
  
  standard:
    description: Recommended features
    include: ["commands/*", "scripts/*"]

# Dependencies
dependencies:
  system:
    - name: git
      required: true
    - name: yq
      required: false
      install: "brew install yq"

# Lifecycle hooks
hooks:
  postInstall: |
    echo "✅ Extension installed!"
    echo "Run /{name}:init to get started"
```

## 🎨 Creating Packages

### 1. Create Package Structure

```bash
mkdir my-extension
cd my-extension

# Create manifest
prism validate --init
# Answer questions to generate prism-package.yaml

# Create commands
mkdir -p commands
echo "# My Command" > commands/my-command.md
```

### 2. Validate Package

```bash
prism validate
# ✅ All validation checks passed!
```

### 3. Create Package

```bash
prism package
# 📦 Created: my-extension-1.0.0.tar.gz
```

### 4. Test Installation

```bash
prism install ./my-extension-1.0.0.tar.gz --dry-run
```

## 🏷️ Installation Variants

PRISM supports multiple installation variants to let users choose their experience:

### Minimal Variant
```bash
prism install my-extension --variant=minimal
```
- Essential features only
- Smaller footprint
- Quick to install

### Standard Variant (Default)
```bash
prism install my-extension --variant=standard
# or simply
prism install my-extension
```
- Recommended features
- Good balance of functionality and simplicity
- Most users should choose this

### Full Variant
```bash
prism install my-extension --variant=full
```
- All features including experimental
- Complete functionality
- For power users

## 🌟 Example Package Installation

Here's how to install a Claude Code extension package:

### Quick Installation
```bash
# Install from GitHub
prism install github:username/package-name

# Install with specific variant
prism install package-name --variant=minimal
```

### Choose Your Experience
- **Minimal**: Core features only
- **Standard**: Recommended feature set (default)
- **Full**: Complete functionality including experimental features

### After Installation
```bash
# List installed packages
prism list

# Get package information
prism info package-name

# Update packages
prism update
```

## 🔧 Configuration

PRISM creates a `.prism/config.json` file in each project:

```json
{
  "version": "1.0.0",
  "registry": "https://registry.prism-claude.io",
  "packages": {
    "my-extension": {
      "version": "1.0.0",
      "variant": "standard",
      "source": "github:username/my-extension"
    }
  }
}
```

## 🚧 Coming Soon

### MCP Integration
- Native support for Model Context Protocol (MCP) servers
- Seamless integration with MCP-based workflows
- MCP server package distribution and management

### Specialized Agent Support
- Pre-configured agent workflows and templates
- Agent-specific command packages
- Workflow automation for common AI development patterns

### Enhanced Features
- Package dependencies and conflict resolution
- Workspace support for multi-project setups
- Advanced validation and security scanning

## 🤝 Contributing

We welcome contributions! Here's how to help:

### For PRISM Development
1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### For Package Development
1. Create packages using PRISM
2. Share them on GitHub/GitLab
3. Add them to our community list
4. Help others with packaging

## 📚 Documentation

- **Package Creation Guide**: See `templates/` directory
- **API Reference**: See `src/` documentation
- **Examples**: Check `examples/` directory
- **Troubleshooting**: Common issues and solutions

## 🆘 Support

### Getting Help
- 📖 Check the documentation first
- 🐛 Report bugs on [GitHub Issues](https://github.com/penguindepot/prism/issues)
- 💬 Ask questions in [GitHub Discussions](https://github.com/penguindepot/prism/discussions)

### Common Issues

**"Package not found"**
- Check package URL/name spelling
- Ensure internet connection
- Try with full GitHub URL

**"Validation failed"**
- Run `prism validate` to see specific issues
- Check `prism-package.yaml` syntax
- Ensure all source files exist

**"Permission denied"**
- Check write permissions in project directory
- Make sure you're in the correct directory
- Try running with appropriate permissions

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claude Code Team** - For creating the amazing AI coding assistant
- **Claude Code Community** - For inspiring the need for a package manager
- **Open Source Community** - For tools and libraries that made this possible

---

**Made with ❤️ for the Claude Code community**

[Get Started](https://github.com/penguindepot/prism#quick-start) • [Documentation](https://github.com/penguindepot/prism/tree/main/examples) • [Examples](https://github.com/penguindepot/prism/tree/main/examples) 