# PRISM Package Authoring Guide

This guide explains how to create a PRISM package for Claude Code extensions.

## Table of Contents
- [Package Structure](#package-structure)
- [Creating Your Package](#creating-your-package)
- [Package Manifest](#package-manifest)
- [Namespacing Convention](#namespacing-convention)
- [CLAUDE.md Integration](#claudemd-integration)
- [Testing Your Package](#testing-your-package)
- [Best Practices](#best-practices)

## Package Structure

A PRISM package follows this directory structure:

```
your-package/
├── .claude/
│   ├── commands/
│   │   └── your-package/        # Namespaced commands
│   │       ├── command1.md
│   │       └── command2.md
│   ├── scripts/
│   │   └── your-package/         # Namespaced scripts
│   │       └── helper.sh
│   ├── agents/
│   │   ├── your-package-agent1.md  # Prefixed agents
│   │   └── your-package-agent2.md
│   ├── rules/
│   │   └── your-package/         # Namespaced rules
│   │       └── standards.md
│   ├── docs/
│   │   └── your-package/         # Namespaced documentation
│   │       └── README.md
│   └── your-package.md           # CLAUDE.md content (appended on install)
├── prism-package.yaml            # Package manifest (required)
└── README.md                     # Package documentation
```

## Creating Your Package

### Step 1: Initialize Directory Structure

```bash
# Create package directory
mkdir my-package
cd my-package

# Create Claude Code structure
mkdir -p .claude/{commands,scripts,agents,rules,docs}/my-package

# Create manifest
touch prism-package.yaml
```

### Step 2: Create the Manifest

Create `prism-package.yaml` with your package configuration:

```yaml
# Package metadata
name: my-package
version: 1.0.0
description: Brief description of your package
author: Your Name
license: MIT
repository: github.com/username/my-package
keywords:
  - claude-code
  - productivity
  - automation

# Claude Code compatibility
claudeCode:
  minVersion: "1.0.0"

# File structure - defines what gets installed
structure:
  commands:
    - source: .claude/commands/my-package/
      dest: .claude/commands/my-package/
      pattern: "**/*.md"
  
  scripts:
    - source: .claude/scripts/my-package/
      dest: .claude/scripts/my-package/
      pattern: "**/*.sh"
  
  agents:
    - source: .claude/agents/
      dest: .claude/agents/
      pattern: "my-package-*.md"
  
  rules:
    - source: .claude/rules/my-package/
      dest: .claude/rules/my-package/
      pattern: "*.md"
  
  documentation:
    - source: .claude/docs/my-package/
      dest: .claude/docs/my-package/
      pattern: "**/*.md"
  
  claude_config:
    - source: .claude/
      dest: .claude/
      pattern: "my-package.md"

# Installation variants (optional)
variants:
  minimal:
    description: Basic features only
    include:
      - ".claude/commands/my-package/essential.md"
      - ".claude/my-package.md"
    exclude:
      - ".claude/commands/my-package/advanced/*"
      - ".claude/agents/*"
  
  standard:
    description: Recommended installation
    include:
      - ".claude/commands/my-package/*"
      - ".claude/scripts/my-package/*"
      - ".claude/rules/my-package/*"
      - ".claude/docs/my-package/*"
      - ".claude/my-package.md"
    exclude:
      - ".claude/agents/*"
  
  full:
    description: Everything including experimental features
    include:
      - "**/*"

# Dependencies (optional)
dependencies:
  system:
    - name: git
      required: true
      version: ">=2.0.0"
    
    - name: node
      required: false
      install: "brew install node || apt-get install nodejs"
      description: "Required for JavaScript-based features"

# Lifecycle hooks (optional)
hooks:
  preInstall: |
    echo "🚀 Installing ${PRISM_PACKAGE_NAME}..."
    # Check prerequisites
  
  postInstall: |
    echo "✅ ${PRISM_PACKAGE_NAME} installed successfully!"
    echo "Available commands: /my-package:*"
  
  preUninstall: |
    echo "Removing ${PRISM_PACKAGE_NAME}..."
  
  postUninstall: |
    echo "${PRISM_PACKAGE_NAME} has been uninstalled"

# Files to ignore when packaging
ignore:
  - .git
  - node_modules
  - test/
  - "*.log"
```

### Step 3: Create Commands

Commands go in `.claude/commands/my-package/`. Each command is a markdown file:

```markdown
# .claude/commands/my-package/hello.md

# Hello Command

Greets the user with a personalized message.

## Usage
/my-package:hello [name]

## Implementation

Run the greeting script:

\`\`\`bash
#!/bin/bash
NAME="${1:-World}"
echo "Hello, $NAME! This is my-package speaking."

# Call helper script if needed
.claude/scripts/my-package/helper.sh "$NAME"
\`\`\`
```

### Step 4: Create Agents

Agents must be prefixed with your package name:

```markdown
# .claude/agents/my-package-analyzer.md
---
name: my-package-analyzer
description: Analyzes code for my-package specific patterns
tools: Read, Grep, Bash
---

You are a specialized analyzer for my-package. When invoked:

1. Analyze the codebase for specific patterns
2. Provide insights and recommendations
3. Suggest improvements

Focus on:
- Pattern detection
- Best practice validation
- Performance optimization
```

### Step 5: Create CLAUDE.md Integration

Create `.claude/my-package.md` that will be appended to the user's CLAUDE.md:

```markdown
# ==========================================
# My Package Configuration
# ==========================================
# This content is automatically appended during installation

## My Package Commands

The following commands are available from my-package:

- `/my-package:hello` - Greet the user
- `/my-package:analyze` - Analyze the project
- `/my-package:optimize` - Optimize code

## My Package Agents

Specialized agents for complex tasks:

- **my-package-analyzer**: Deep code analysis
- **my-package-optimizer**: Performance optimization

Use these agents via the Task tool.

## Package Guidelines

When using my-package:
1. Always validate input before processing
2. Follow the coding standards in `.claude/rules/my-package/`
3. Check documentation at `.claude/docs/my-package/`

## Configuration

My-package specific settings:
- Default timeout: 30 seconds
- Max file size: 10MB
- Supported languages: JavaScript, Python, Go
```

## Namespacing Convention

To avoid conflicts between packages, follow these naming rules:

### Commands & Scripts & Rules & Docs
Use subdirectories with your package name:
- ✅ `.claude/commands/my-package/`
- ✅ `.claude/scripts/my-package/`
- ✅ `.claude/rules/my-package/`
- ✅ `.claude/docs/my-package/`

### Agents
Use package name as prefix:
- ✅ `my-package-conflict-resolver.md`
- ✅ `my-package-analyzer.md`
- ❌ `analyzer.md` (too generic, will conflict)

### CLAUDE.md Content
Name the file with your package name:
- ✅ `.claude/my-package.md`
- ❌ `.claude/config.md` (too generic)

## CLAUDE.md Integration

The `.claude/my-package.md` file is special:
- It gets **appended** to the user's main CLAUDE.md during installation
- It gets **removed** from CLAUDE.md during uninstallation
- It should contain package-specific configuration and documentation
- Use clear section headers to organize content

## Testing Your Package

### 1. Local Testing

```bash
# In your package directory
prism package

# This creates my-package-1.0.0.tar.gz
```

### 2. Test Installation

```bash
# In a test project
prism init
prism install /path/to/my-package

# Or install the tarball
prism install /path/to/my-package-1.0.0.tar.gz
```

### 3. Verify Installation

```bash
# Check installed files
ls -la .claude/commands/my-package/
ls -la .claude/agents/my-package-*.md

# Check CLAUDE.md was updated
cat .claude/CLAUDE.md

# List installed packages
prism list
```

### 4. Test Commands

In Claude Code:
```
/my-package:hello
```

### 5. Test Uninstallation

```bash
prism uninstall my-package

# Verify files are removed
ls -la .claude/commands/

# Verify CLAUDE.md was cleaned
cat .claude/CLAUDE.md
```

## Best Practices

### 1. Namespace Everything
Always use your package name to avoid conflicts:
- Commands: `/my-package:command`
- Scripts: `.claude/scripts/my-package/`
- Agents: `my-package-agent.md`

### 2. Document Commands
Each command should include:
- Clear description
- Usage examples
- Options/parameters
- Error handling

### 3. Make Scripts Executable
Ensure scripts have proper shebangs:
```bash
#!/bin/bash
# or
#!/usr/bin/env python3
```

### 4. Handle Errors Gracefully
```bash
# Check prerequisites
if ! command -v git &> /dev/null; then
    echo "Error: git is required but not installed"
    exit 1
fi
```

### 5. Support Variants
Offer installation options:
- `minimal`: Core features only
- `standard`: Recommended set
- `full`: Everything including experimental

### 6. Version Compatibility
Specify Claude Code version requirements:
```yaml
claudeCode:
  minVersion: "1.0.0"
  maxVersion: "2.0.0"  # Optional
```

### 7. Clean Uninstall
Ensure your package:
- Removes all installed files
- Cleans up CLAUDE.md entries
- Doesn't leave orphaned directories

### 8. Test Thoroughly
Before publishing:
- Test all commands work
- Test all variants install correctly
- Test uninstall removes everything
- Test on different platforms if applicable

## Example Packages

See the `examples/` directory for complete package examples:
- `git-toolkit`: Git workflow automation
- `cccc`: Complete command and context management

## Publishing Your Package

Once your package is ready:

1. **GitHub/GitLab**: Push to a public repository
   ```bash
   prism install github:username/my-package
   ```

2. **Direct URL**: Host the tarball
   ```bash
   prism install https://example.com/my-package-1.0.0.tar.gz
   ```

3. **Registry** (coming soon): Publish to PRISM registry
   ```bash
   prism publish my-package-1.0.0.tar.gz
   ```

## Troubleshooting

### Package Won't Install
- Check `prism-package.yaml` syntax
- Validate with: `prism validate`
- Ensure all source paths exist

### Commands Not Found
- Verify namespace: `/my-package:command`
- Check file permissions
- Ensure `.md` extension on command files

### CLAUDE.md Not Updated
- Check `claude_config` in structure
- Verify `.claude/my-package.md` exists
- Look for errors in install output

### Agents Not Discovered
- Use package prefix: `my-package-*.md`
- Place in `.claude/agents/` root (not subdirectory)
- Check agent frontmatter syntax

## Support

For help with package authoring:
- GitHub Issues: https://github.com/penguindepot/prism/issues
- Examples: `/examples/` directory
- Documentation: `/docs/`

## Contributing

We welcome new packages! Please:
1. Follow the naming conventions
2. Include comprehensive documentation
3. Test on multiple platforms
4. Submit to the package registry (coming soon)