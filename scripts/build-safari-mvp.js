#!/usr/bin/env node

/**
 * Build Safari MVP web-extension staging bundle from active runtime files.
 *
 * Why this exists:
 * - keeps current Chrome runtime unchanged
 * - avoids large source moves
 * - prepares an Xcode-convertible Safari package on demand
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outRoot = path.join(root, 'apps', 'ext-safari', 'build');
const outWebExtension = path.join(outRoot, 'web-extension');

const sourceDirs = [
  'background',
  'content-scripts',
  'popup',
  'dashboard',
  'lib',
  'assets',
  'config'
];

const sourceFiles = ['manifest.json'];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(srcAbs, dstAbs) {
  ensureDir(path.dirname(dstAbs));
  fs.copyFileSync(srcAbs, dstAbs);
}

function copyDir(srcAbs, dstAbs) {
  ensureDir(dstAbs);
  const entries = fs.readdirSync(srcAbs, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;

    const nextSrc = path.join(srcAbs, entry.name);
    const nextDst = path.join(dstAbs, entry.name);

    if (entry.isDirectory()) {
      copyDir(nextSrc, nextDst);
      continue;
    }

    copyFile(nextSrc, nextDst);
  }
}

function build() {
  fs.rmSync(outWebExtension, { recursive: true, force: true });
  ensureDir(outWebExtension);

  for (const rel of sourceDirs) {
    const srcAbs = path.join(root, rel);
    const dstAbs = path.join(outWebExtension, rel);

    if (!fs.existsSync(srcAbs)) {
      throw new Error(`Missing source directory: ${rel}`);
    }

    copyDir(srcAbs, dstAbs);
  }

  for (const rel of sourceFiles) {
    const srcAbs = path.join(root, rel);
    const dstAbs = path.join(outWebExtension, rel);

    if (!fs.existsSync(srcAbs)) {
      throw new Error(`Missing source file: ${rel}`);
    }

    copyFile(srcAbs, dstAbs);
  }

  // Keep manifest close to Chrome runtime and apply Safari-safe tweaks only.
  const manifestPath = path.join(outWebExtension, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (Array.isArray(manifest.permissions)) {
    manifest.permissions = manifest.permissions.filter((permission) => permission !== 'unlimitedStorage');
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const buildInfo = {
    builtAt: new Date().toISOString(),
    sourceRoot: root,
    outputDir: outWebExtension,
    sourceDirs,
    sourceFiles,
    notes: [
      'Generated for Safari Web Extension conversion.',
      'Do not edit generated files directly.',
      'Re-run npm run build:safari-mvp after runtime changes.'
    ]
  };

  ensureDir(outRoot);
  fs.writeFileSync(path.join(outRoot, 'BUILD_INFO.json'), JSON.stringify(buildInfo, null, 2) + '\n');

  console.log(`OK: Safari MVP web-extension bundle generated at ${outWebExtension}`);
}

try {
  build();
} catch (error) {
  console.error(`Safari MVP build failed: ${error.message}`);
  process.exit(1);
}
