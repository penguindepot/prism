# CCCC as a PRISM Package

This directory contains an example of how to package the CCCC (Claude Code Command Center) system as a PRISM package for easy distribution and installation.

## Overview

The CCCC package provides a complete command and context management system for Claude Code, including:

- **Context Management**: Persistent session context across Claude Code sessions
- **PRD Workflow**: Product Requirements Document creation and parsing
- **Epic Management**: Task decomposition and issue generation
- **GitLab/GitHub Integration**: Complete workflow automation with platform APIs
- **MR Lifecycle**: Automated merge request workflows with review processing

## Installation Variants

### Minimal (10 commands)
Essential context management only:
```bash
prism install cccc --variant=minimal
```

**Includes:**
- Context creation, priming, and updates
- Basic CCCC initialization
- Essential templates

**Use cases:**
- Simple projects
- Users who only need context persistence
- Getting started with CCCC

### Standard (25 commands) - Recommended
Full workflows including PRD and Epic management:
```bash
prism install cccc --variant=standard
```

**Includes:**
- All minimal features
- PRD creation and parsing
- Epic analysis and synchronization
- Core workflow automation

**Use cases:**
- Most development projects
- Teams using structured development workflows
- Users who want PRD-to-implementation pipelines

### Full (40+ commands)
Complete system with MR workflows and platform integration:
```bash
prism install cccc
# or
prism install cccc --variant=full
```

**Includes:**
- All standard features
- Complete MR lifecycle management
- Advanced GitLab/GitHub integration
- Issue management and tracking
- Epic archival system

**Use cases:**
- Complex projects with multiple contributors
- Teams using GitLab/GitHub workflows
- Users who want complete automation

## Installation Examples

### From GitHub (Recommended)
```bash
prism install github:penguindepot/cccc
```

### From GitLab
```bash
prism install gitlab:penguindepot/cccc
```

### With Specific Variant
```bash
prism install github:penguindepot/cccc --variant=minimal
```

### Dry Run (Preview Only)
```bash
prism install github:penguindepot/cccc --dry-run
```

## Post-Installation

After installing CCCC via PRISM:

1. **Initialize the system:**
   ```
   /cccc:init
   ```

2. **Choose your platform:**
   - Select GitHub or GitLab
   - System will configure platform-specific commands

3. **Create project context:**
   ```
   /context:create
   ```

4. **Start developing:**
   - Create PRDs with `/cccc:prd:new`
   - Manage epics with `/cccc:epic:analyze`
   - Use context commands like `/context:prime`

## Dependencies

### Required
- **git** (≥2.0.0): Version control operations

### Optional (Platform-specific)
- **yq**: YAML processing for analysis files
- **jq**: JSON processing for CLI operations
- **gh**: GitHub CLI for GitHub integration
- **glab**: GitLab CLI for GitLab integration

PRISM will check these dependencies during installation and provide installation instructions for missing optional dependencies.

## File Structure

When installed, CCCC creates the following structure:

```
.claude/
├── commands/
│   ├── cccc/          # CCCC commands
│   ├── context/       # Context management
│   └── utils/         # Utility commands
├── scripts/
│   ├── cccc/          # CCCC automation scripts
│   └── utils/         # Utility scripts
└── rules/             # Shared behavioral rules

.cccc/
├── context/           # Project context files
├── prds/              # Product requirements
├── epics/             # Generated epics
├── templates/         # Default templates
└── cccc-config.yml    # CCCC configuration
```

## Conversion from Original CCCC

If you have an existing CCCC installation, you can migrate to the PRISM version:

1. **Backup your current setup:**
   ```bash
   cp -r .cccc .cccc.backup
   cp -r .claude .claude.backup
   ```

2. **Uninstall manually installed CCCC:**
   ```bash
   # Remove old commands and scripts
   rm -rf .claude/commands/cccc
   rm -rf .claude/scripts/cccc
   ```

3. **Install via PRISM:**
   ```bash
   prism install cccc --variant=full
   ```

4. **Restore your data:**
   ```bash
   # Keep your existing context and PRDs
   cp -r .cccc.backup/* .cccc/
   ```

## Customization

The PRISM package supports customization through:

### Variant Selection
Choose the appropriate variant for your needs during installation.

### Configuration
Edit `.cccc/cccc-config.yml` after installation to customize:
- Git platform preferences
- Default behaviors
- Integration settings

### Templates
Customize templates in `.cccc/templates/` for your organization's needs.

## Troubleshooting

### Installation Issues
- **Dependency errors**: Install missing dependencies as suggested
- **Permission errors**: Ensure write access to project directory
- **Git errors**: Verify you're in a git repository

### Runtime Issues
- **Command not found**: Verify variant includes the command
- **Platform errors**: Check platform CLI tools (gh/glab) are installed
- **Context issues**: Run `/context:validate` to check context health

## Support

For issues with the CCCC package:
1. Check the main repository: https://github.com/penguindepot/cccc
2. Run diagnostics: `/cccc:validate` (if available in your variant)
3. Report issues with PRISM installation: Use `prism info cccc` for details

## Contributing

To contribute to CCCC packaging:
1. Fork the main CCCC repository
2. Modify the `prism-package.yaml` as needed
3. Test installation with `prism install ./local-path`
4. Submit pull requests to the main repository