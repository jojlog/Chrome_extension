#!/usr/bin/env node

/**
 * Validate Safari MVP scaffolding files exist and are coherent.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();

const requiredFiles = [
  'apps/ext-safari/README.md',
  'apps/ext-safari/platform-adapter.js',
  'scripts/build-safari-mvp.js',
  'scripts/convert-safari-mvp.js',
  'docs/safari-mvp.md'
];

const missing = requiredFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));

if (missing.length) {
  console.error('Safari MVP scaffold check failed:');
  for (const rel of missing) {
    console.error(`- missing ${rel}`);
  }
  process.exit(1);
}

const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) {
  console.error('Safari MVP scaffold check failed: root manifest is not MV3.');
  process.exit(1);
}

if (!manifest.background || !manifest.background.service_worker) {
  console.error('Safari MVP scaffold check failed: missing background service worker path.');
  process.exit(1);
}

console.log('OK: Safari MVP scaffolding verified.');
