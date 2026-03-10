# apps

Platform-specific code belongs here.

Target platforms:
- `apps/ext-chrome`
- `apps/ext-safari`
- `apps/web`
- `apps/ios-app`

Current production runtime remains in legacy root paths to avoid risky refactors.
Use this folder for gradual migration and adapter separation.

Adapter contract reference:
- `apps/ext-chrome/adapter-contract.md`
