#!/usr/bin/env node

/**
 * Validate platform adapter contract exports.
 */

const path = require('path');
const { pathToFileURL } = require('url');

const root = process.cwd();

const adapters = [
  { name: 'ext-chrome', file: 'apps/ext-chrome/platform-adapter.js' },
  { name: 'ext-safari', file: 'apps/ext-safari/platform-adapter.js' },
  { name: 'web', file: 'apps/web/platform-adapter.js' },
  { name: 'ios-app', file: 'apps/ios-app/platform-adapter.js' }
];

const requiredFunctionExports = [
  'runtimeId',
  'isSupported',
  'getCapabilities',
  'addRuntimeMessageListener',
  'sendRuntimeMessage',
  'storageLocalGet',
  'storageLocalSet',
  'storageSyncGet',
  'storageSyncSet',
  'tabsQuery',
  'tabsSendMessage',
  'tabsCreate',
  'tabsRemove',
  'tabsCaptureVisible',
  'permissionsContains',
  'scriptingExecuteScript',
  'notificationsCreate',
  'alarmsCreate',
  'addAlarmListener',
  'removeAlarmListener'
];

(async () => {
  let failed = false;

  for (const adapter of adapters) {
    const fileUrl = pathToFileURL(path.join(root, adapter.file)).href;
    let mod;

    try {
      mod = await import(fileUrl);
    } catch (error) {
      failed = true;
      console.error(`Failed to import ${adapter.name} adapter (${adapter.file}): ${error.message}`);
      continue;
    }

    if (typeof mod.PLATFORM !== 'string' || !mod.PLATFORM) {
      failed = true;
      console.error(`${adapter.name}: missing string export PLATFORM`);
    }

    for (const fnName of requiredFunctionExports) {
      if (typeof mod[fnName] !== 'function') {
        failed = true;
        console.error(`${adapter.name}: missing function export ${fnName}`);
      }
    }

    if (typeof mod.getCapabilities === 'function') {
      try {
        const caps = mod.getCapabilities();
        if (!caps || typeof caps !== 'object') {
          failed = true;
          console.error(`${adapter.name}: getCapabilities() did not return an object`);
        }
      } catch (error) {
        failed = true;
        console.error(`${adapter.name}: getCapabilities() threw error: ${error.message}`);
      }
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log(`OK: adapter contract validated for ${adapters.length} platform adapters.`);
})();
