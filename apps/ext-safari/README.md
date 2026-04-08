# ext-safari

Safari platform layer (MVP scaffold).

Status:
- Runtime wiring: not implemented (no production traffic)
- Adapter status: `platform-adapter.js` compatibility shim available
- Safari staging bundle: `npm run build:safari-mvp`
- Xcode conversion: `npm run convert:safari-mvp` (requires macOS + Xcode tools)
- Feature flags: default OFF

Structure:
- `platform-adapter.js`: Safari-compatible adapter contract implementation
- `build/`: generated staging and Xcode output (gitignored)

Rules:
- Keep Safari-specific differences in adapter/modules under `apps/ext-safari`.
- Keep shared logic/types in `packages/*`.
- Do not change Chrome active runtime wiring while iterating Safari MVP.
