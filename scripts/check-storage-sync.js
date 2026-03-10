#!/usr/bin/env node

/**
 * Verify storage-layer runtime copies remain synchronized with canonical files.
 *
 * Scope:
 * - packages/core/storage-manager.js <-> lib/storage-manager.js
 * - packages/core/storage/*.js <-> lib/storage/*.js
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();

const pairs = [
  ['packages/core/storage-manager.js', 'lib/storage-manager.js'],
  ['packages/core/storage/account-storage.js', 'lib/storage/account-storage.js'],
  ['packages/core/storage/category-storage.js', 'lib/storage/category-storage.js'],
  ['packages/core/storage/interaction-storage.js', 'lib/storage/interaction-storage.js'],
  ['packages/core/storage/settings-storage.js', 'lib/storage/settings-storage.js']
];

const diffs = [];
for (const [canonicalRel, runtimeRel] of pairs) {
  const canonical = path.join(root, canonicalRel);
  const runtime = path.join(root, runtimeRel);

  if (!fs.existsSync(canonical) || !fs.existsSync(runtime)) {
    diffs.push({ canonicalRel, runtimeRel, reason: 'missing file' });
    continue;
  }

  const canonicalText = fs.readFileSync(canonical, 'utf8');
  const runtimeText = fs.readFileSync(runtime, 'utf8');

  if (canonicalText !== runtimeText) {
    diffs.push({ canonicalRel, runtimeRel, reason: 'content mismatch' });
  }
}

if (diffs.length) {
  console.error('Storage sync check failed:');
  for (const d of diffs) {
    console.error(`- ${d.canonicalRel} <-> ${d.runtimeRel}: ${d.reason}`);
  }
  process.exit(1);
}

console.log(`OK: storage sync verified (${pairs.length} file pairs).`);
