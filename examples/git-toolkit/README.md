# Git Toolkit - PRISM Package Example

This is an example PRISM package demonstrating the recommended package structure for Claude Code extensions.

## Package Structure

This package follows the PRISM packaging convention:

```
git-toolkit/
├── .claude/
│   ├── commands/git-toolkit/     # Commands namespaced under package name
│   ├── scripts/git-toolkit/      # Scripts namespaced under package name
│   ├── agents/                   # Agents with package name prefix
│   │   ├── git-toolkit-conflict-resolver.md
│   │   └── git-toolkit-history-analyzer.md
│   ├── rules/git-toolkit/        # Rules namespaced under package name
│   ├── docs/git-toolkit/         # Documentation namespaced
│   └── git-toolkit.md            # Content to append to CLAUDE.md
├── prism-package.yaml            # Package manifest
└── README.md                     # This file
```

## Key Features

### Namespaced Structure
- All commands are under `/git-toolkit:*` namespace
- Scripts and rules are in `git-toolkit/` subdirectories
- Agents use `git-toolkit-` prefix for uniqueness
- Documentation is organized under `docs/git-toolkit/`

### CLAUDE.md Integration
The `.claude/git-toolkit.md` file contains content that will be appended to the user's CLAUDE.md during installation, providing:
- Command documentation
- Agent descriptions
- Package-specific rules and guidelines
- References to full documentation

### Installation Variants
The package supports three installation variants:
- `minimal` - Basic commands only
- `standard` - Full command set (default)
- `full` - Everything including experimental features

## Installation

```bash
prism install git-toolkit
```

Or install from local directory:
```bash
prism install git-toolkit --local
```

## Testing the Package

1. Package the toolkit:
```bash
prism pack
```

2. Install locally:
```bash
prism install git-toolkit-1.0.0.tar.gz --local
```

3. Verify installation:
```bash
prism list
```

## Package Benefits

This structure ensures:
- **No conflicts** between packages
- **Clear ownership** of commands and resources
- **Easy discovery** of package contents
- **Clean uninstallation** without affecting other packages
- **Automatic CLAUDE.md updates** for package documentation

## For Package Authors

When creating your own PRISM package, follow this structure:
1. Namespace everything under your package name
2. Use package name prefix for agents
3. Create a `package-name.md` file for CLAUDE.md content
4. Document all commands and features
5. Support multiple installation variants