#!/bin/bash

# Script to create private GitHub repository "AVO" and push code

set -e

echo "🚀 Creating private GitHub repository 'AVO'..."

# Check if already authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI is not authenticated."
    echo ""
    echo "Please run: gh auth login"
    echo "Then run this script again."
    exit 1
fi

# Check if origin remote already exists
if git remote get-url origin &>/dev/null 2>&1; then
    echo "⚠️  Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Create private repository and push
echo "📦 Creating private repository 'AVO' on GitHub..."
gh repo create AVO --private --source=. --remote=origin --push

echo ""
echo "✅ Success! Your code has been pushed to:"
echo "   https://github.com/$(gh api user --jq .login)/AVO"
echo ""
echo "Repository is set to PRIVATE."

