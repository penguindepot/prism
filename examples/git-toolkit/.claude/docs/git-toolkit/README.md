# Git Toolkit Documentation

Welcome to Git Toolkit - Advanced Git workflow automation tools for Claude Code.

## Overview

Git Toolkit provides intelligent Git operations with Claude Code, including:
- Smart commit message generation
- Conflict resolution assistance
- Branch management automation
- History analysis and insights

## Quick Start

After installation, you'll have access to these commands:

### Basic Commands
- `/git-toolkit:status` - Enhanced git status with insights
- `/git-toolkit:commit` - Smart commit with message suggestions
- `/git-toolkit:branch` - Advanced branch management

### Agents
- `git-toolkit-conflict-resolver` - Helps resolve merge conflicts
- `git-toolkit-history-analyzer` - Analyzes repository history

## Installation

Install using PRISM:
```bash
prism install git-toolkit
```

Choose your variant:
- `minimal` - Basic commands only
- `standard` - Full command set (default)
- `full` - Everything including experimental features

## Command Reference

### /git-toolkit:status

Shows enhanced repository status with:
- Current branch and upstream tracking
- Categorized file changes
- Actionable suggestions

**Usage:**
```
/git-toolkit:status [--branch] [--verbose]
```

### /git-toolkit:commit

Creates commits with intelligent message suggestions based on your changes.

**Usage:**
```
/git-toolkit:commit [--interactive] [--template=<format>]
```

**Templates:**
- `conventional` - Conventional commit format
- `semantic` - Semantic versioning format
- `auto` - Automatic detection (default)

### /git-toolkit:branch

Manages branches with safety checks and automation.

**Actions:**
- `create` - Create new branch with naming conventions
- `switch` - Switch branches with safety checks
- `cleanup` - Remove merged branches

**Usage:**
```
/git-toolkit:branch <action> [options]
```

## Agent Usage

### Conflict Resolver

When you encounter merge conflicts:
```
Use the Task tool to invoke git-toolkit-conflict-resolver agent
```

The agent will:
1. Analyze all conflicts
2. Understand the intent of changes
3. Propose resolutions
4. Apply fixes if approved

### History Analyzer

To get insights about your repository:
```
Use the Task tool to invoke git-toolkit-history-analyzer agent
```

The agent provides:
- Development patterns
- Code hotspots
- Contribution analysis
- Workflow recommendations

## Configuration

Git Toolkit respects your global git configuration and adds these enhancements:

### Custom Templates

Create custom commit templates in `.claude/docs/git-toolkit/templates/`:
```
my-template.txt
```

### Workflow Rules

Define workflow rules in `.claude/rules/git-toolkit/`:
- Branch protection rules
- Commit message validation
- Pre-push checks

## Best Practices

1. **Commit Often**: Use `/git-toolkit:commit` for consistent messages
2. **Clean Branches**: Run `/git-toolkit:branch cleanup` weekly
3. **Analyze History**: Use history analyzer monthly for insights
4. **Resolve Conflicts**: Let the conflict resolver agent help

## Troubleshooting

### Command Not Found
Ensure Git Toolkit is installed:
```bash
prism list
```

### Git Not Available
Git Toolkit requires Git 2.30+:
```bash
git --version
```

### Permission Errors
Ensure scripts are executable:
```bash
chmod +x .claude/scripts/git-toolkit/*.sh
```

## Contributing

Git Toolkit is open source. Contribute at:
https://github.com/example/git-toolkit

## Support

For issues or questions:
- GitHub Issues: https://github.com/example/git-toolkit/issues
- Documentation: .claude/docs/git-toolkit/