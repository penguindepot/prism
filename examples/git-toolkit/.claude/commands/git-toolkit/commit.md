# Smart Commit Helper

Intelligent commit creation with automatic message suggestions and validation.

## Usage
```
/git-toolkit:commit [--interactive] [--template=<template>]
```

## Description
Creates commits with:
- Automatic commit message suggestions based on changes
- Pre-commit validation
- Template-based commit messages
- Interactive staging assistance

## Implementation

Run the commit helper script with intelligent suggestions:

```bash
#!/bin/bash

# Check if there are changes to commit
if git diff --quiet && git diff --cached --quiet; then
    echo "❌ No changes to commit"
    exit 1
fi

echo "🔍 Analyzing changes for commit..."

# Run the smart commit script
.claude/scripts/git-toolkit/commit-helper.sh "$@"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Commit created successfully!"
    echo "💡 Use /git-toolkit:status to see updated status"
else
    echo ""
    echo "❌ Commit failed or cancelled"
    echo "💡 Use 'git status' to review your changes"
fi
```

## Options

- `--interactive`: Launch interactive staging mode
- `--template=conventional`: Use conventional commit format
- `--template=semantic`: Use semantic versioning format