# Manual Sync Guide (Pre-Bundler)

Last updated: 2026-03-10

Until esbuild/rollup adoption, keep these pairs synchronized manually.

| Canonical source (`packages/*` or `apps/*`) | Active runtime copy | Why |
|---|---|---|
| `packages/core/feature-flags.js` | `apps/ext-chrome/feature-flags.inline.js` | MV3 content-script compatible inline output |
| `packages/core/constants.js` | `lib/constants.js` | Runtime still imports `lib/constants.js` |
| `packages/core/utils.js` | `lib/utils.js` | Runtime still imports `lib/utils.js` |
| `packages/core/storage-manager.js` | `lib/storage-manager.js` | Service worker uses runtime path |
| `packages/core/storage/account-storage.js` | `lib/storage/account-storage.js` | Storage behavior must remain identical |
| `packages/core/storage/category-storage.js` | `lib/storage/category-storage.js` | Storage behavior must remain identical |
| `packages/core/storage/interaction-storage.js` | `lib/storage/interaction-storage.js` | Storage behavior must remain identical |
| `packages/core/storage/settings-storage.js` | `lib/storage/settings-storage.js` | Storage behavior must remain identical |
| `apps/ext-chrome/popup/*` | `popup/*` | Chrome popup runtime output |
| `apps/ext-chrome/dashboard/*` | `dashboard/*` | Chrome dashboard runtime output |
| `apps/ext-chrome/background/service-worker.js` | `background/service-worker.js` | Background runtime output |

## Verification Commands

```bash
npm run check:mv3-content-script
npm run check:flag-sync
npm run check:storage-sync
npm run check:adapter-contract
npm run check:ui-sync
npm run check:background-sync
```

## PR Checklist Shortcut

1. Update canonical file in `packages/*` or `apps/*` first.
2. Apply equivalent change to runtime/inline copy.
3. Run checks.
4. Update `docs/parity-matrix.md` if platform availability changes.
