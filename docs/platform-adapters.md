# Platform Adapter Notes

Last updated: 2026-03-10

## Purpose

Adapters isolate platform-specific APIs from shared logic so migration can proceed
without risky runtime refactors.

## Files

- `apps/ext-chrome/platform-adapter.js`
- `apps/ext-safari/platform-adapter.js`
- `apps/web/platform-adapter.js`
- `apps/ios-app/platform-adapter.js`

## Current Status

| Adapter | Status | Runtime wiring |
|---|---|---|
| `ext-chrome` | implemented bridge | not yet wired |
| `ext-safari` | compatibility shim/stub | not wired |
| `web` | unsupported stub | not wired |
| `ios-app` | unsupported stub | not wired |

## API Differences to Isolate

- Extension runtime messaging (`runtime.sendMessage`, `runtime.onMessage`)
- Storage (`storage.local`, `storage.sync`)
- Tabs operations and screenshot capture
- Script injection (`scripting.executeScript`)
- Permissions checks
- Notifications/alarms

## Rule

Any platform-specific branching should live in adapter modules, not shared package code.
