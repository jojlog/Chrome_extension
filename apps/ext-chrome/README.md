# ext-chrome

Chrome extension platform layer.

Current runtime is still rooted in legacy paths:
- `background/`
- `content-scripts/`
- `popup/`
- `dashboard/`

This folder is a migration-safe source layer.

Includes:
- `feature-flags.inline.js` (MV3-compatible flag output)
- `platform-adapter.js` (Chrome API adapter contract implementation)
- `adapter-contract.md` (shared contract for all platform adapters)
- `popup/*` (mirrored source for future build input)
- `dashboard/*` (mirrored source for future build input)
- `background/service-worker.js` (mirrored source for future build input)

Rules:
- Keep Chrome-only differences in adapters here.
- Keep content script code inline-compatible for MV3.
- Do not add direct `import/export` to active content-script entries.
- Keep mirrored UI and background files synchronized with runtime copies.
