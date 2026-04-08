# packages/core

Shared business-logic source of truth.

Current scope:
- `feature-flags.js`: cross-platform feature flags and platform map
- `constants.js`: message/platform/category constants
- `utils.js`: shared utility helpers
- `storage-manager.js` and `storage/*`: storage layer canonical copies

Until a bundler is introduced, runtime entry paths keep using legacy root files.
Keep canonical/runtime pairs synchronized per `docs/sync-manual.md`.
