# Adapter Contract

This contract is shared by:
- `apps/ext-chrome/platform-adapter.js`
- `apps/ext-safari/platform-adapter.js`
- `apps/web/platform-adapter.js`
- `apps/ios-app/platform-adapter.js`

Required exports:
- `PLATFORM`
- `runtimeId()`
- `isSupported()`
- `getCapabilities()`
- `addRuntimeMessageListener(listener)`
- `sendRuntimeMessage(message)`
- `storageLocalGet(keys)`
- `storageLocalSet(values)`
- `storageSyncGet(keys)`
- `storageSyncSet(values)`
- `tabsQuery(queryInfo)`
- `tabsSendMessage(tabId, message)`
- `tabsCreate(createProperties)`
- `tabsRemove(tabId)`
- `tabsCaptureVisible(windowId, options)`
- `permissionsContains(permissionRequest)`
- `scriptingExecuteScript(details)`
- `notificationsCreate(options)`
- `alarmsCreate(name, alarmInfo)`
- `addAlarmListener(listener)`
- `removeAlarmListener(listener)`

Notes:
- Only `ext-chrome` is production-ready right now.
- Other platform adapters are explicit stubs or pre-integration shims.
