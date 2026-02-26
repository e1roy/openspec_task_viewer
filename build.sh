#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(cat version.txt | tr -d '[:space:]')
echo "Building OpenSpec Task Viewer v${VERSION} ..."

# Update version in package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
rm -f package.json.bak

# Install dependencies
echo "Installing dependencies..."
npm install

# Compile TypeScript
echo "Compiling TypeScript..."
npm run compile

# Package as VSIX
echo "Packaging VSIX..."
npx @vscode/vsce package --no-dependencies --allow-missing-repository --no-rewrite-relative-links

OUTPUT_FILE="openspec-task-viewer-${VERSION}.vsix"
if [ -f "$OUTPUT_FILE" ]; then
    echo ""
    echo "Build successful!"
    echo "Output: ${OUTPUT_FILE}"
else
    echo "Build failed: ${OUTPUT_FILE} not found."
    exit 1
fi
