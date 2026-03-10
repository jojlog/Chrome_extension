/**
 * Safari platform adapter stub.
 *
 * Keeps adapter contract aligned with ext-chrome while Safari runtime wiring
 * remains out of scope for current migration phase.
 */

export const PLATFORM = 'ext-safari';

function getApi() {
  return globalThis.browser || globalThis.chrome || null;
}

function requireApi(methodName) {
  const api = getApi();
  if (!api) {
    throw new Error(`[${PLATFORM}] ${methodName}: extension API unavailable`);
  }
  return api;
}

function callbackFallback(api, methodName, invokeWithCallback) {
  return new Promise((resolve, reject) => {
    try {
      invokeWithCallback((result) => {
        const lastError = api?.runtime?.lastError;
        if (lastError) {
          reject(new Error(lastError.message || `${methodName} failed`));
          return;
        }
        resolve(result);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function callApi(methodName, promiseCall, callbackCall) {
  const api = requireApi(methodName);
  if (typeof globalThis.browser !== 'undefined') {
    return promiseCall(api);
  }
  return callbackFallback(api, methodName, callbackCall(api));
}

export function runtimeId() {
  const api = getApi();
  return api?.runtime?.id || null;
}

export function isSupported() {
  return Boolean(getApi());
}

export function getCapabilities() {
  const api = getApi();
  return Object.freeze({
    runtime: Boolean(api?.runtime),
    storageLocal: Boolean(api?.storage?.local),
    storageSync: Boolean(api?.storage?.sync),
    tabs: Boolean(api?.tabs),
    scripting: Boolean(api?.scripting),
    notifications: Boolean(api?.notifications),
    permissions: Boolean(api?.permissions),
    alarms: Boolean(api?.alarms)
  });
}

export function addRuntimeMessageListener(listener) {
  const api = requireApi('addRuntimeMessageListener');
  api.runtime.onMessage.addListener(listener);
  return () => api.runtime.onMessage.removeListener(listener);
}

export async function sendRuntimeMessage(message) {
  return callApi(
    'sendRuntimeMessage',
    (api) => api.runtime.sendMessage(message),
    (api) => (cb) => api.runtime.sendMessage(message, cb)
  );
}

export async function storageLocalGet(keys) {
  return callApi(
    'storageLocalGet',
    (api) => api.storage.local.get(keys),
    (api) => (cb) => api.storage.local.get(keys, cb)
  );
}

export async function storageLocalSet(values) {
  return callApi(
    'storageLocalSet',
    (api) => api.storage.local.set(values),
    (api) => (cb) => api.storage.local.set(values, cb)
  );
}

export async function storageSyncGet(keys) {
  return callApi(
    'storageSyncGet',
    (api) => api.storage.sync.get(keys),
    (api) => (cb) => api.storage.sync.get(keys, cb)
  );
}

export async function storageSyncSet(values) {
  return callApi(
    'storageSyncSet',
    (api) => api.storage.sync.set(values),
    (api) => (cb) => api.storage.sync.set(values, cb)
  );
}

export async function tabsQuery(queryInfo) {
  return callApi(
    'tabsQuery',
    (api) => api.tabs.query(queryInfo),
    (api) => (cb) => api.tabs.query(queryInfo, cb)
  );
}

export async function tabsSendMessage(tabId, message) {
  return callApi(
    'tabsSendMessage',
    (api) => api.tabs.sendMessage(tabId, message),
    (api) => (cb) => api.tabs.sendMessage(tabId, message, cb)
  );
}

export async function tabsCreate(createProperties) {
  return callApi(
    'tabsCreate',
    (api) => api.tabs.create(createProperties),
    (api) => (cb) => api.tabs.create(createProperties, cb)
  );
}

export async function tabsRemove(tabId) {
  return callApi(
    'tabsRemove',
    (api) => api.tabs.remove(tabId),
    (api) => (cb) => api.tabs.remove(tabId, cb)
  );
}

export async function tabsCaptureVisible(windowId, options = { format: 'png' }) {
  return callApi(
    'tabsCaptureVisible',
    (api) => {
      if (typeof windowId === 'number') {
        return api.tabs.captureVisibleTab(windowId, options);
      }
      return api.tabs.captureVisibleTab(options);
    },
    (api) => (cb) => {
      if (typeof windowId === 'number') {
        api.tabs.captureVisibleTab(windowId, options, cb);
        return;
      }
      api.tabs.captureVisibleTab(options, cb);
    }
  );
}

export async function permissionsContains(permissionRequest) {
  return callApi(
    'permissionsContains',
    (api) => api.permissions.contains(permissionRequest),
    (api) => (cb) => api.permissions.contains(permissionRequest, cb)
  );
}

export async function scriptingExecuteScript(details) {
  return callApi(
    'scriptingExecuteScript',
    (api) => api.scripting.executeScript(details),
    (api) => (cb) => api.scripting.executeScript(details, cb)
  );
}

export async function notificationsCreate(options) {
  return callApi(
    'notificationsCreate',
    (api) => api.notifications.create(options),
    (api) => (cb) => api.notifications.create(options, cb)
  );
}

export function alarmsCreate(name, alarmInfo) {
  const api = requireApi('alarmsCreate');
  api.alarms.create(name, alarmInfo);
}

export function addAlarmListener(listener) {
  const api = requireApi('addAlarmListener');
  api.alarms.onAlarm.addListener(listener);
  return () => api.alarms.onAlarm.removeListener(listener);
}

export function removeAlarmListener(listener) {
  const api = requireApi('removeAlarmListener');
  api.alarms.onAlarm.removeListener(listener);
}
