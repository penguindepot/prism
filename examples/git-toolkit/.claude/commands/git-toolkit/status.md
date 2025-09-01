# Enhanced Git Status

Show comprehensive git status with additional context and suggestions.

## Usage
```
/git-toolkit:status [--branch] [--verbose]
```

## Description
This command provides an enhanced view of your repository status, including:
- Current branch and tracking information
- File changes with context
- Suggestions for next actions
- Branch comparison information

## Implementation

Check if we have uncommitted changes and provide actionable insights:

```bash
#!/bin/bash

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
TRACKING_BRANCH=$(git rev-parse --abbrev-ref @{u} 2>/dev/null || echo "no-upstream")

echo "📍 Current branch: $CURRENT_BRANCH"
if [ "$TRACKING_BRANCH" != "no-upstream" ]; then
    echo "🔗 Tracking: $TRACKING_BRANCH"
    
    # Check if we're ahead/behind
    AHEAD=$(git rev-list --count HEAD..$TRACKING_BRANCH 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count $TRACKING_BRANCH..HEAD 2>/dev/null || echo "0")
    
    if [ "$AHEAD" -gt 0 ]; then
        echo "⬇️  Behind by $AHEAD commits"
    fi
    if [ "$BEHIND" -gt 0 ]; then
        echo "⬆️  Ahead by $BEHIND commits"
    fi
fi

echo ""
echo "📋 Working directory status:"

# Enhanced status with file type categorization
git status --porcelain | while read -r status file; do
    case $status in
        "M ") echo "✏️  Modified: $file" ;;
        "A ") echo "➕ Added: $file" ;;
        "D ") echo "➖ Deleted: $file" ;;
        "??") echo "❓ Untracked: $file" ;;
        "MM") echo "⚠️  Modified (staged & unstaged): $file" ;;
        *) echo "$status $file" ;;
    esac
done

# Suggestions
echo ""
echo "💡 Suggestions:"
if git diff --quiet --cached; then
    echo "   • No staged changes - use 'git add' to stage files"
else
    echo "   • Ready to commit - use /git-toolkit:commit"
fi

if [ "$AHEAD" -gt 0 ]; then
    echo "   • Pull latest changes: git pull"
fi
if [ "$BEHIND" -gt 0 ]; then
    echo "   • Push your changes: git push"
fi
```