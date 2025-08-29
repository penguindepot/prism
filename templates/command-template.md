---
allowed-tools: Bash, Read, Write, LS
---

# {Command Name}

Brief description of what this command does and its purpose.

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For consistent timestamp handling
- `.claude/rules/{relevant-rule}.md` - For specific operations

## Preflight Checklist

Before proceeding, complete these validation steps:

### 1. Prerequisites Check
- Run: `test -d ".claude" && echo "Claude directory exists" || echo "No .claude directory"`
- Verify required tools are available:
  - `which git > /dev/null && echo "Git available" || echo "Git required"`
  - `which {tool} > /dev/null && echo "{tool} available" || echo "{tool} missing"`

### 2. Project State Validation
- Check current working directory is correct
- Verify any required files exist
- Validate current git status if needed

### 3. Permission Check
- Ensure write permissions where needed
- Check file system space if creating files
- Validate network connectivity if required

## Instructions

### 1. Initial Setup
Describe the initial setup steps required for this command.

### 2. Core Operation
Detail the main operation this command performs:

1. **Step 1**: First major step
   - Sub-step details
   - Expected outcomes

2. **Step 2**: Second major step
   - Sub-step details
   - Validation points

3. **Step 3**: Final steps
   - Cleanup operations
   - Status reporting

### 3. Validation and Cleanup
- Verify operation completed successfully
- Clean up temporary files
- Update any status files
- Report results to user

## Error Handling

### Common Issues
- **Issue 1**: Description and solution
- **Issue 2**: Description and solution

### Error Recovery
If the command fails:
1. Check the specific error message
2. Verify prerequisites are met
3. Try suggested solutions
4. Report issue if problem persists

## Examples

### Basic Usage
```bash
# Example of basic command usage
/{namespace}:{command}
```

### Advanced Usage
```bash
# Example with options or parameters
/{namespace}:{command} parameter --option
```

## Output

Describe what output the user should expect:
- Success messages
- Progress indicators
- Final status report

## Related Commands

- `/{namespace}:related-command` - Brief description
- `/{namespace}:another-command` - Brief description

## Notes

- Any important notes about this command
- Limitations or considerations
- Best practices