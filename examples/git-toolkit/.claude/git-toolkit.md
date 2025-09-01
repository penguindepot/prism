# ==========================================
# Git Toolkit Package Configuration
# ==========================================
# This content is appended to CLAUDE.md during installation

## Git Toolkit Commands

The Git Toolkit package provides these commands:

### Repository Management
- `/git-toolkit:status` - Enhanced git status with actionable insights
- `/git-toolkit:commit` - Smart commit helper with message suggestions
- `/git-toolkit:branch` - Advanced branch management operations

### Available Agents

Git Toolkit includes specialized agents for complex git operations:

- **git-toolkit-conflict-resolver**: Intelligently resolves merge conflicts by analyzing both sides
- **git-toolkit-history-analyzer**: Provides deep insights into repository history and patterns

Use these agents via the Task tool when you need specialized git assistance.

### Git Workflow Rules

When using Git Toolkit commands, follow these practices:
1. Always review suggested commit messages before accepting
2. Use the conflict resolver for complex merges
3. Run history analysis periodically for codebase insights

### Package Documentation

For detailed information about Git Toolkit:
- **Full Documentation**: `.claude/docs/git-toolkit/README.md`
- **Commit Standards**: `.claude/rules/git-toolkit/commit-standards.md`
- **Command Reference**: Use `/git-toolkit:status --help` for any command

### Script Locations

Git Toolkit scripts are located in:
- `.claude/scripts/git-toolkit/` - Core functionality scripts
- `.claude/commands/git-toolkit/` - Command definitions

## Git Best Practices

When working with git in this project:
1. Use `/git-toolkit:commit` for consistent commit messages
2. Run `/git-toolkit:status` before pushing to check branch status
3. Use `/git-toolkit:branch cleanup` regularly to maintain a clean repository