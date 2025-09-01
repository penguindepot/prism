# Branch Management

Advanced branch creation, switching, and management with workflow automation.

## Usage
```
/git-toolkit:branch <action> [options]
```

## Actions

### create
```
/git-toolkit:branch create <branch-name> [--from=<base-branch>] [--track]
```
Create a new branch with automatic naming conventions and setup.

### switch
```
/git-toolkit:branch switch <branch-name> [--create-if-missing]
```
Switch to a branch with safety checks and cleanup.

### cleanup
```
/git-toolkit:branch cleanup [--dry-run] [--merged-only]
```
Clean up old branches that have been merged.

## Implementation

Run branch management operations:

```bash
#!/bin/bash

ACTION="$1"
shift

case "$ACTION" in
    "create")
        echo "🌱 Creating new branch..."
        .claude/scripts/git-toolkit/branch-create.sh "$@"
        ;;
    "switch")
        echo "🔄 Switching branch..."
        .claude/scripts/git-toolkit/branch-switch.sh "$@"
        ;;
    "cleanup")
        echo "🧹 Cleaning up branches..."
        .claude/scripts/git-toolkit/branch-cleanup.sh "$@"
        ;;
    *)
        echo "❌ Unknown action: $ACTION"
        echo ""
        echo "Available actions:"
        echo "  create   - Create a new branch"
        echo "  switch   - Switch to a branch"
        echo "  cleanup  - Clean up merged branches"
        exit 1
        ;;
esac
```