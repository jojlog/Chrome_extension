# Safari MVP Guide

Last updated: 2026-03-11

This guide builds a Safari Web Extension MVP without changing active Chrome runtime wiring.

## Scope

- Generate Safari staging bundle from active runtime sources.
- Convert staging bundle to Xcode project for local run/signing.
- Keep feature flags for `ext-safari` OFF until runtime parity is validated.

## Prerequisites

- macOS
- Xcode installed
- Xcode Command Line Tools installed

## Commands

```bash
npm run check:safari-mvp
npm run build:safari-mvp
npm run convert:safari-mvp
```

Optional env vars:

```bash
export SAFARI_APP_NAME="Content Tracker"
export SAFARI_BUNDLE_ID="com.zone.contenttracker.safari"
```

## Output Paths

- Staging web extension: `apps/ext-safari/build/web-extension`
- Build metadata: `apps/ext-safari/build/BUILD_INFO.json`
- Converted Xcode project: `apps/ext-safari/build/xcode-project`

## Notes

- Safari and Chrome extension storage are separate containers.
- Existing Chrome `chrome.storage.local` data is not auto-shared with Safari.
- Re-run `npm run build:safari-mvp` after runtime source changes.
