# Git Toolkit Commit Standards

When working with Git Toolkit commands and making commits, follow these standards:

## Commit Message Format

Use conventional commit format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Test additions or modifications
- **chore**: Maintenance tasks

### Scope
The scope should be the area of code affected:
- commands
- scripts
- agents
- rules
- docs

### Subject
- Use imperative mood ("Add feature" not "Added feature")
- Don't capitalize first letter
- No period at the end
- Limit to 50 characters

## Branch Naming

Follow these patterns:
- Features: `feature/<ticket-id>-<brief-description>`
- Fixes: `fix/<ticket-id>-<brief-description>`
- Hotfixes: `hotfix/<brief-description>`
- Releases: `release/<version>`

## Pre-commit Checks

Before committing:
1. Ensure all scripts are executable
2. Validate markdown syntax
3. Check for sensitive information
4. Run any applicable tests

## Merge Commit Messages

For merge commits:
```
Merge branch '<branch-name>' into <target-branch>

Summary of changes:
- Change 1
- Change 2
- Change 3
```