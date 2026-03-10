#!/usr/bin/env node

/**
 * Check whether packages/core/feature-flags.js and
 * apps/ext-chrome/feature-flags.inline.js share the same FEATURES key set.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const canonicalPath = path.join(root, 'packages/core/feature-flags.js');
const inlinePath = path.join(root, 'apps/ext-chrome/feature-flags.inline.js');

for (const p of [canonicalPath, inlinePath]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing file: ${path.relative(root, p)}`);
    process.exit(1);
  }
}

const canonical = fs.readFileSync(canonicalPath, 'utf8');
const inline = fs.readFileSync(inlinePath, 'utf8');

function extractFeaturesBlock(src) {
  const patterns = [
    /export\s+const\s+FEATURES\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/m,
    /var\s+FEATURES\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/m,
    /const\s+FEATURES\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/m
  ];

  for (const pattern of patterns) {
    const match = src.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return '';
}

function extractFeatureKeysFromBlock(block) {
  const keys = new Set();
  const regex = /\b([A-Z][A-Z0-9_]+)\s*:\s*['\"][a-z0-9-]+['\"]/g;
  let m;
  while ((m = regex.exec(block))) {
    keys.add(m[1]);
  }
  return [...keys].sort();
}

const cBlock = extractFeaturesBlock(canonical);
const iBlock = extractFeaturesBlock(inline);

if (!cBlock || !iBlock) {
  console.error('Could not parse FEATURES block from one or more files.');
  process.exit(1);
}

const cKeys = extractFeatureKeysFromBlock(cBlock);
const iKeys = extractFeatureKeysFromBlock(iBlock);

const cOnly = cKeys.filter((k) => !iKeys.includes(k));
const iOnly = iKeys.filter((k) => !cKeys.includes(k));

if (cOnly.length || iOnly.length) {
  console.error('Feature-flag key sync check failed.');
  if (cOnly.length) {
    console.error('Only in packages/core/feature-flags.js:', cOnly.join(', '));
  }
  if (iOnly.length) {
    console.error('Only in apps/ext-chrome/feature-flags.inline.js:', iOnly.join(', '));
  }
  process.exit(1);
}

console.log(`OK: feature keys are synchronized (${cKeys.length} keys).`);
