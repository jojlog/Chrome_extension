# Monorepo Migration Plan (Safe, Incremental)

Last updated: 2026-03-10

Goal:
- Keep runtime stable while moving toward `packages/*` source-of-truth + `apps/*` platform layout.
- Do not break existing Chrome extension behavior.
- Keep stored user content/data untouched.

## Current Runtime Baseline

Active runtime paths:
- `manifest.json`
- `background/service-worker.js`
- `content-scripts/*`
- `popup/*`
- `dashboard/*`
- `lib/*`

Migration prep paths (added):
- `apps/*`
- `packages/*`

## Progress Snapshot

Completed safely (no runtime wiring changes):
- PR-A: `constants/utils` extracted to `packages/core` with runtime copies kept.
- PR-B: `storage-manager` + `storage/*` extracted to `packages/core` with runtime copies kept.
- PR-C: adapter contract hardened (`apps/ext-chrome`, `apps/ext-safari`, `apps/web`, `apps/ios-app`).
- PR-D: popup/dashboard source mirrored under `apps/ext-chrome` + UI sync check.
- PR-E: background service worker mirrored under `apps/ext-chrome` + background sync check.
- Feature-flag source and parity/PR governance docs added.
- MV3/flag/storage/adapter/UI/background verification scripts added.

## Phase 0 (Completed)

- Added `packages/core/feature-flags.js` as canonical shared feature source.
- Added `apps/ext-chrome/feature-flags.inline.js` as MV3-compatible manual output.
- Added parity matrix and PR template with platform/MV3 checks.

## Phase 1 (Completed)

1. Move pure constants/types to `packages/*` while preserving runtime copies.
2. Keep active runtime unchanged.
3. Add explicit sync comment headers in runtime copies.

Acceptance criteria:
- No manifest path change.
- No behavior change.
- All tests/manual smoke behave as before.

## Phase 2 (Completed)

1. Duplicate storage layer to `packages/*` while preserving runtime copies.
2. Keep active runtime unchanged.
3. Add sync verification checks.

Acceptance criteria:
- No storage schema/key change.
- No behavior change.
- Runtime and canonical storage files remain synchronized.

## Phase 3 (Completed)

1. Implement Chrome adapter APIs in `apps/ext-chrome/platform-adapter.js`.
2. Introduce Safari/Web/iOS adapter stubs without runtime wiring.
3. Document platform-specific API differences and adapter contract.

Acceptance criteria:
- Platform differences isolated in adapter layer docs/code.
- No runtime wiring changes.

## Phase 4 (Completed)

1. Mirror runtime entries under `apps/ext-chrome/` as future build inputs.
2. Keep root runtime entries as active output until bundler adoption.
3. Expand sync scripts/checks to mirrored entries.

Acceptance criteria:
- For each active root entry, mapped future input exists.
- Sync checks pass.

## Phase 5 (Bundler adoption; next major milestone)

1. Introduce esbuild/rollup pipeline.
2. Set `apps/ext-chrome/*` as input, root runtime paths as output.
3. Replace manual sync with generated artifacts.

Acceptance criteria:
- Generated output behavior equals previous runtime.
- Manual sync steps can be removed.

## File Mapping Table (Target)

| Current active path | Target source-of-truth | Notes |
|---|---|---|
| `lib/constants.js` | `packages/core/constants.js` | Keep runtime copy until bundler |
| `lib/utils.js` | `packages/core/utils.js` | Keep runtime copy until bundler |
| `lib/storage/*.js` | `packages/core/storage/*.js` | Data schema unchanged |
| `lib/storage-manager.js` | `packages/core/storage-manager.js` | Service worker depends on this |
| `lib/ai-categorizer.js` | `packages/core/ai-categorizer.js` | API provider logic shared |
| `content-scripts/shared/*` | `packages/core/content-shared/*` | Must remain inline-compatible output |
| `content-scripts/<platform>/*` | `apps/ext-chrome/content-scripts/<platform>/*` | Platform-specific selectors/trackers |
| `popup/*` | `apps/ext-chrome/popup/*` | Mirrored in PR-D |
| `dashboard/*` | `apps/ext-chrome/dashboard/*` | Mirrored in PR-D |
| `background/service-worker.js` | `apps/ext-chrome/background/service-worker.js` | Mirrored in PR-E |

## Safe Change Rules

- Never change storage keys/schema during migration-only PRs.
- No large directory moves in one PR.
- Move one logical module group at a time.
- Keep parity matrix and flag tables updated each PR.

## PR Chunking Recommendation

1. PR-A: constants/utils duplication + sync comments. (done)
2. PR-B: storage layer duplication + no runtime wiring. (done)
3. PR-C: adapter hardening for ext-chrome and platform stubs. (done)
4. PR-D: popup/dashboard source mirror in `apps/ext-chrome`. (done)
5. PR-E: background/source mirror + sync tooling expansion. (done)
6. PR-F: bundler introduction.
