#!/usr/bin/env node

/**
 * Convert Safari MVP staging bundle to an Xcode project.
 * Requires macOS with Xcode command line tools installed.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const inputDir = path.join(root, 'apps', 'ext-safari', 'build', 'web-extension');
const projectDir = path.join(root, 'apps', 'ext-safari', 'build', 'xcode-project');
const appName = process.env.SAFARI_APP_NAME || 'Content Tracker';
const bundleId = process.env.SAFARI_BUNDLE_ID || 'com.zone.contenttracker.safari';

if (!fs.existsSync(inputDir)) {
  console.error('Missing Safari staging bundle. Run: npm run build:safari-mvp');
  process.exit(1);
}

const findConverter = spawnSync('xcrun', ['--find', 'safari-web-extension-converter'], {
  encoding: 'utf8'
});

if (findConverter.status !== 0) {
  console.error('safari-web-extension-converter not found. Install Xcode + command line tools first.');
  console.error('Then run: npm run convert:safari-mvp');
  process.exit(1);
}

fs.mkdirSync(path.dirname(projectDir), { recursive: true });

const args = [
  'safari-web-extension-converter',
  inputDir,
  '--project-location',
  projectDir,
  '--app-name',
  appName,
  '--bundle-identifier',
  bundleId,
  '--force'
];

const result = spawnSync('xcrun', args, { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`OK: Safari Xcode project generated at ${projectDir}`);
