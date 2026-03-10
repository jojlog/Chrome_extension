/**
 * iOS app adapter stub.
 *
 * Placeholder for future native bridge integration (WKWebView/Swift bridge).
 */

export const PLATFORM = 'ios-app';

function unsupported(methodName) {
  return Promise.reject(new Error(`[${PLATFORM}] ${methodName}: not supported`));
}

export function runtimeId() {
  return null;
}

export function isSupported() {
  return false;
}

export function getCapabilities() {
  return Object.freeze({
    runtime: false,
    storageLocal: false,
    storageSync: false,
    tabs: false,
    scripting: false,
    notifications: false,
    permissions: false,
    alarms: false
  });
}

export function addRuntimeMessageListener(_listener) {
  return () => {};
}

export async function sendRuntimeMessage(_message) {
  return unsupported('sendRuntimeMessage');
}

export async function storageLocalGet(_keys) {
  return unsupported('storageLocalGet');
}

export async function storageLocalSet(_values) {
  return unsupported('storageLocalSet');
}

export async function storageSyncGet(_keys) {
  return unsupported('storageSyncGet');
}

export async function storageSyncSet(_values) {
  return unsupported('storageSyncSet');
}

export async function tabsQuery(_queryInfo) {
  return unsupported('tabsQuery');
}

export async function tabsSendMessage(_tabId, _message) {
  return unsupported('tabsSendMessage');
}

export async function tabsCreate(_createProperties) {
  return unsupported('tabsCreate');
}

export async function tabsRemove(_tabId) {
  return unsupported('tabsRemove');
}

export async function tabsCaptureVisible(_windowId, _options) {
  return unsupported('tabsCaptureVisible');
}

export async function permissionsContains(_permissionRequest) {
  return unsupported('permissionsContains');
}

export async function scriptingExecuteScript(_details) {
  return unsupported('scriptingExecuteScript');
}

export async function notificationsCreate(_options) {
  return unsupported('notificationsCreate');
}

export function alarmsCreate(_name, _alarmInfo) {
  return undefined;
}

export function addAlarmListener(_listener) {
  return () => {};
}

export function removeAlarmListener(_listener) {
  return undefined;
}
