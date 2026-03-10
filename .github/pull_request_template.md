## Summary

- 

## Platform Impact

- [ ] This change affects `ext-chrome`
- [ ] This change affects `ext-safari`
- [ ] This change affects `web`
- [ ] This change affects `ios-app`
- [ ] No platform behavior change

## Monorepo Rules Checklist

- [ ] Shared logic/types/UI changes are made in `packages/*` first.
- [ ] Platform-specific behavior changes are isolated to `apps/*` adapters/entrypoints.
- [ ] Legacy runtime paths (root folders) were not refactored in a risky way.

## Adapter Layer Checklist

- [ ] Platform API branching is implemented only in adapter modules.
- [ ] Adapter contract is preserved across all platform adapter files.
- [ ] `npm run check:adapter-contract` passes.

## Mirror Sync Checklist

- [ ] `apps/ext-chrome/popup/*` and `popup/*` are synchronized.
- [ ] `apps/ext-chrome/dashboard/*` and `dashboard/*` are synchronized.
- [ ] `apps/ext-chrome/background/service-worker.js` and `background/service-worker.js` are synchronized.
- [ ] `npm run check:ui-sync` passes.
- [ ] `npm run check:background-sync` passes.

## Chrome MV3 Content Script Safety

- [ ] No `import/export` was introduced in active content scripts.
- [ ] Chrome content scripts remain inline-compatible.
- [ ] If shared logic changed, manual sync notes were added.

## Feature Flag Checklist

- [ ] `packages/core/feature-flags.js` updated (when feature surface changed).
- [ ] Unfinished platforms remain `OFF` by default.
- [ ] `apps/ext-chrome/feature-flags.inline.js` synchronized (until bundler adoption).
- [ ] `docs/parity-matrix.md` updated.

## Verification

- [ ] Existing user data/storage schema remains compatible.
- [ ] Manual smoke test completed on impacted platform(s).
- [ ] No breaking manifest/runtime path changes.
- [ ] `npm run check:repo` completed.

## Notes

- 
