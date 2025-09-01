#!/bin/bash

# Smart commit helper - analyzes changes and suggests commit messages
# Usage: commit-helper.sh [--interactive] [--template=<template>]

set -e

INTERACTIVE=false
TEMPLATE="auto"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --interactive)
            INTERACTIVE=true
            shift
            ;;
        --template=*)
            TEMPLATE="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Analyze changes
analyze_changes() {
    local changes=""
    local file_count=0
    
    # Check staged changes
    while IFS= read -r line; do
        file_count=$((file_count + 1))
        file=$(echo "$line" | cut -c4-)
        status=$(echo "$line" | cut -c1-2)
        
        case "$status" in
            "M ") changes="${changes}Modified $file\n" ;;
            "A ") changes="${changes}Added $file\n" ;;
            "D ") changes="${changes}Deleted $file\n" ;;
            "R ") changes="${changes}Renamed $file\n" ;;
        esac
    done < <(git diff --cached --name-status)
    
    if [ $file_count -eq 0 ]; then
        echo "❌ No staged changes found. Use 'git add' to stage files."
        exit 1
    fi
    
    echo "📊 Changes to commit ($file_count files):"
    echo -e "$changes"
}

# Generate commit message suggestions
suggest_commit_message() {
    local primary_change=""
    local change_type="feat"
    
    # Analyze the types of changes
    local has_new_files=$(git diff --cached --name-only --diff-filter=A | wc -l)
    local has_modified_files=$(git diff --cached --name-only --diff-filter=M | wc -l)
    local has_deleted_files=$(git diff --cached --name-only --diff-filter=D | wc -l)
    
    # Determine change type
    if [ "$has_new_files" -gt 0 ] && [ "$has_modified_files" -eq 0 ] && [ "$has_deleted_files" -eq 0 ]; then
        change_type="feat"
        primary_change="Add new functionality"
    elif [ "$has_deleted_files" -gt 0 ]; then
        change_type="refactor"
        primary_change="Remove and cleanup code"
    elif [ "$has_modified_files" -gt 0 ]; then
        # Try to detect if it's a fix or feature based on keywords in diff
        if git diff --cached | grep -qi "fix\|bug\|error\|issue"; then
            change_type="fix"
            primary_change="Fix issues and bugs"
        else
            change_type="feat"
            primary_change="Update and improve functionality"
        fi
    fi
    
    case "$TEMPLATE" in
        "conventional")
            echo "$change_type: $primary_change"
            ;;
        "semantic")
            if [ "$change_type" = "feat" ]; then
                echo "[FEATURE] $primary_change"
            elif [ "$change_type" = "fix" ]; then
                echo "[BUGFIX] $primary_change"
            else
                echo "[REFACTOR] $primary_change"
            fi
            ;;
        *)
            echo "$primary_change"
            ;;
    esac
}

# Interactive commit message editor
interactive_commit() {
    local suggested_msg="$1"
    
    echo ""
    echo "💡 Suggested commit message:"
    echo "   $suggested_msg"
    echo ""
    
    read -p "Use this message? (y/n/e=edit): " -n 1 -r
    echo ""
    
    case $REPLY in
        y|Y)
            git commit -m "$suggested_msg"
            ;;
        e|E)
            git commit
            ;;
        *)
            echo "Commit cancelled."
            exit 1
            ;;
    esac
}

# Main execution
main() {
    echo "🔍 Smart Commit Helper"
    echo "====================="
    
    analyze_changes
    
    local suggested_message
    suggested_message=$(suggest_commit_message)
    
    if [ "$INTERACTIVE" = true ]; then
        interactive_commit "$suggested_message"
    else
        echo ""
        echo "💡 Suggested commit message: $suggested_message"
        echo ""
        read -p "Proceed with commit? (y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git commit -m "$suggested_message"
        else
            echo "Commit cancelled."
            exit 1
        fi
    fi
}

main