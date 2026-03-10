/**
 * Chrome platform adapter.
 *
 * Contract target for future runtime wiring.
 * This module is not wired into active runtime yet.
 */

export const PLATFORM = 'ext-chrome';

function getApi() {
  if (typeof chrome === 'undefined') {
    return null;
  }
  return chrome;
}

function requireApi(methodName) {
  const api = getApi();
  if (!api) {
    throw new Error(`[${PLATFORM}] ${methodName}: chrome API unavailable`);
  }
  return api;
}

function withCallback(methodName, invoke) {
  return new Promise((resolve, reject) => {
    try {
      invoke((result) => {
        const api = getApi();
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
  const api = requireApi('sendRuntimeMessage');
  return withCallback('sendRuntimeMessage', (cb) => api.runtime.sendMessage(message, cb));
}

export async function storageLocalGet(keys) {
  const api = requireApi('storageLocalGet');
  return withCallback('storageLocalGet', (cb) => api.storage.local.get(keys, cb));
}

export async function storageLocalSet(values) {
  const api = requireApi('storageLocalSet');
  return withCallback('storageLocalSet', (cb) => api.storage.local.set(values, cb));
}

export async function storageSyncGet(keys) {
  const api = requireApi('storageSyncGet');
  return withCallback('storageSyncGet', (cb) => api.storage.sync.get(keys, cb));
}

export async function storageSyncSet(values) {
  const api = requireApi('storageSyncSet');
  return withCallback('storageSyncSet', (cb) => api.storage.sync.set(values, cb));
}

export async function tabsQuery(queryInfo) {
  const api = requireApi('tabsQuery');
  return withCallback('tabsQuery', (cb) => api.tabs.query(queryInfo, cb));
}

export async function tabsSendMessage(tabId, message) {
  const api = requireApi('tabsSendMessage');
  return withCallback('tabsSendMessage', (cb) => api.tabs.sendMessage(tabId, message, cb));
}

export async function tabsCreate(createProperties) {
  const api = requireApi('tabsCreate');
  return withCallback('tabsCreate', (cb) => api.tabs.create(createProperties, cb));
}

export async function tabsRemove(tabId) {
  const api = requireApi('tabsRemove');
  return withCallback('tabsRemove', (cb) => api.tabs.remove(tabId, cb));
}

export async function tabsCaptureVisible(windowId, options = { format: 'png' }) {
  const api = requireApi('tabsCaptureVisible');
  if (typeof windowId === 'number') {
    return withCallback('tabsCaptureVisible', (cb) => api.tabs.captureVisibleTab(windowId, options, cb));
  }
  return withCallback('tabsCaptureVisible', (cb) => api.tabs.captureVisibleTab(options, cb));
}

export async function permissionsContains(permissionRequest) {
  const api = requireApi('permissionsContains');
  return withCallback('permissionsContains', (cb) => api.permissions.contains(permissionRequest, cb));
}

export async function scriptingExecuteScript(details) {
  const api = requireApi('scriptingExecuteScript');
  return withCallback('scriptingExecuteScript', (cb) => api.scripting.executeScript(details, cb));
}

export async function notificationsCreate(options) {
  const api = requireApi('notificationsCreate');
  return withCallback('notificationsCreate', (cb) => api.notifications.create(options, cb));
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
