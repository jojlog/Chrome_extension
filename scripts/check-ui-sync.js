#!/usr/bin/env node

/**
 * Verify popup/dashboard runtime files stay synchronized with
 * apps/ext-chrome mirrored source files.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();

const mirrorGroups = [
  { runtimeDir: 'popup', sourceDir: 'apps/ext-chrome/popup' },
  { runtimeDir: 'dashboard', sourceDir: 'apps/ext-chrome/dashboard' }
];

function listFiles(dirRel) {
  const dirAbs = path.join(root, dirRel);
  if (!fs.existsSync(dirAbs)) return [];

  const out = [];
  function walk(currentAbs, currentRel) {
    const entries = fs.readdirSync(currentAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue;
      const nextAbs = path.join(currentAbs, entry.name);
      const nextRel = path.join(currentRel, entry.name);
      if (entry.isDirectory()) {
        walk(nextAbs, nextRel);
      } else {
        out.push(nextRel.split(path.sep).join('/'));
      }
    }
  }

  walk(dirAbs, '');
  return out.sort();
}

const problems = [];

for (const group of mirrorGroups) {
  const runtimeFiles = listFiles(group.runtimeDir);
  const sourceFiles = listFiles(group.sourceDir);

  const runtimeSet = new Set(runtimeFiles);
  const sourceSet = new Set(sourceFiles);

  for (const rel of runtimeFiles) {
    if (!sourceSet.has(rel)) {
      problems.push(`${group.sourceDir}/${rel} missing (exists in ${group.runtimeDir})`);
    }
  }

  for (const rel of sourceFiles) {
    if (!runtimeSet.has(rel)) {
      problems.push(`${group.runtimeDir}/${rel} missing (exists in ${group.sourceDir})`);
    }
  }

  for (const rel of runtimeFiles) {
    if (!sourceSet.has(rel)) continue;

    const runtimeText = fs.readFileSync(path.join(root, group.runtimeDir, rel), 'utf8');
    const sourceText = fs.readFileSync(path.join(root, group.sourceDir, rel), 'utf8');

    if (runtimeText !== sourceText) {
      problems.push(`${group.sourceDir}/${rel} differs from ${group.runtimeDir}/${rel}`);
    }
  }
}

if (problems.length) {
  console.error('UI sync check failed:');
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log('OK: popup/dashboard mirror sync verified.');
