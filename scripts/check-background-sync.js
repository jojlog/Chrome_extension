#!/usr/bin/env node

/**
 * Verify background service worker runtime file stays synchronized with
 * apps/ext-chrome mirrored source file.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const runtimeRel = 'background/service-worker.js';
const mirrorRel = 'apps/ext-chrome/background/service-worker.js';

const runtimePath = path.join(root, runtimeRel);
const mirrorPath = path.join(root, mirrorRel);

if (!fs.existsSync(runtimePath)) {
  console.error(`Missing runtime file: ${runtimeRel}`);
  process.exit(1);
}

if (!fs.existsSync(mirrorPath)) {
  console.error(`Missing mirror file: ${mirrorRel}`);
  process.exit(1);
}

const runtimeText = fs.readFileSync(runtimePath, 'utf8');
const mirrorText = fs.readFileSync(mirrorPath, 'utf8');

if (runtimeText !== mirrorText) {
  console.error('Background sync check failed:');
  console.error(`- ${mirrorRel} differs from ${runtimeRel}`);
  process.exit(1);
}

console.log('OK: background mirror sync verified.');
