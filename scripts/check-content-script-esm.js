#!/usr/bin/env node

/**
 * Ensure active content scripts (from manifest.json) do not use direct
 * ESM import/export statements in MV3 runtime entries.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const manifestPath = path.join(root, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error('manifest.json not found');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const contentScripts = manifest.content_scripts || [];
const activeFiles = [...new Set(contentScripts.flatMap((cs) => cs.js || []))];

const directEsmPattern = /^\s*(import\s.+from\s+['\"]|import\s*['\"]|export\s)/m;

const violations = [];
for (const relPath of activeFiles) {
  const absPath = path.join(root, relPath);
  if (!fs.existsSync(absPath)) {
    violations.push({ relPath, reason: 'missing file' });
    continue;
  }

  const code = fs.readFileSync(absPath, 'utf8');
  if (directEsmPattern.test(code)) {
    violations.push({ relPath, reason: 'direct import/export statement' });
  }
}

if (violations.length) {
  console.error('MV3 content-script ESM check failed:');
  for (const v of violations) {
    console.error(`- ${v.relPath}: ${v.reason}`);
  }
  process.exit(1);
}

console.log(`OK: ${activeFiles.length} active content-script files, no direct import/export statements.`);
