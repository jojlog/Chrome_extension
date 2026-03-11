# Platform Parity Matrix

Last updated: 2026-03-11

Legend:
- `ON`: implemented and enabled
- `OFF`: not implemented (or intentionally hidden by feature flag)

Source of truth:
- Shared flags: `packages/core/feature-flags.js`
- Chrome inline compatibility output: `apps/ext-chrome/feature-flags.inline.js`

| Feature | Flag Key | web | ext-chrome | ext-safari | ios-app | Notes |
|---|---|---|---|---|---|---|
| Core tracking hooks | `core-tracking` | OFF | ON | OFF | OFF | Likes/saves/bookmarks/retweets capture |
| Auto import from saved pages | `auto-import` | OFF | ON | OFF | OFF | Controlled in popup/settings |
| Auto-scroll import | `auto-scroll-import` | OFF | ON | OFF | OFF | Supported pages only |
| Dashboard UI | `dashboard-ui` | OFF | ON | OFF | OFF | Chrome extension dashboard |
| Export / Import data | `export-import` | OFF | ON | OFF | OFF | JSON backup/restore |
| AI categorization | `ai-categorization` | OFF | ON | OFF | OFF | OpenAI/Gemini via user key |
| Account management | `account-management` | OFF | ON | OFF | OFF | Stored in local extension storage |
| Post preview capture | `post-preview-capture` | OFF | ON | OFF | OFF | Uses `tabs.captureVisibleTab` |
| Instagram caption fetch | `instagram-caption-fetch` | OFF | ON | OFF | OFF | Metadata fallback parsing |
| YouTube caption fetch | `youtube-caption-fetch` | OFF | ON | OFF | OFF | Timedtext parsing |
| TikTok feed hook | `tiktok-feed-hook` | OFF | ON | OFF | OFF | Injected hook bridge |

## Adapter Layer Readiness

| Platform | Adapter file | Status | Runtime wiring |
|---|---|---|---|
| ext-chrome | `apps/ext-chrome/platform-adapter.js` | Implemented | not wired |
| ext-safari | `apps/ext-safari/platform-adapter.js` | Shim/stub | not wired |
| web | `apps/web/platform-adapter.js` | Unsupported stub | not wired |
| ios-app | `apps/ios-app/platform-adapter.js` | Unsupported stub | not wired |

## ext-chrome Mirror Readiness

| Area | Source mirror | Active runtime | Sync check |
|---|---|---|---|
| Popup UI | `apps/ext-chrome/popup/*` | `popup/*` | `npm run check:ui-sync` |
| Dashboard UI | `apps/ext-chrome/dashboard/*` | `dashboard/*` | `npm run check:ui-sync` |
| Background SW | `apps/ext-chrome/background/service-worker.js` | `background/service-worker.js` | `npm run check:background-sync` |

## ext-safari MVP Readiness

| Area | Status | Command / Path |
|---|---|---|
| Safari scaffold check | ON | `npm run check:safari-mvp` |
| Safari staging bundle build | ON | `npm run build:safari-mvp` |
| Xcode conversion flow | ON | `npm run convert:safari-mvp` |
| Runtime parity validated | OFF | Pending QA on Safari |

## 운영 규칙

1. 공통 기능/타입은 `packages/*`에 먼저 반영한다.
2. 빌드 도구 도입 전까지 `apps/ext-chrome/feature-flags.inline.js`를 수동 동기화한다.
3. 미완성 플랫폼(`web`, `ext-safari`, `ios-app`) 기능은 기본 `OFF` 유지한다.
4. Safari MVP 스캐폴드는 배포 준비 완료를 의미하지 않는다(런타임 검증 필요).
5. 플랫폼 영향이 있는 PR은 이 문서를 반드시 갱신한다.

## 현재 상태 요약

- 현재 프로덕션 런타임은 루트 경로(`background/`, `content-scripts/`, `popup/`, `dashboard/`, `lib/`)를 사용한다.
- `apps/*`, `packages/*`는 대규모 이동 없이 모노레포 전환을 위한 준비 레이어로 추가되었다.
- `apps/ext-safari`는 MVP 변환 파이프라인이 추가되었지만 기능 플래그는 기본 OFF다.
