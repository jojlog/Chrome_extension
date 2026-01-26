Saved/Liked View Capture Plan (Verified Against Codebase)
Problem Statement
Users may like/save content on other devices (mobile app, different browser) without the extension. When they later browse their saved/liked/bookmarked content pages, the extension should capture those items automatically.

Current Codebase Baseline
- BasePlatformTracker already supports detectPageMode(), bulkCaptureVisiblePosts(), captureImportedInteraction(), importedFrom, and capturedPostIds.
- TwitterTracker already implements detectPageMode for bookmarks and likes.
- MutationObserver already watches added posts; it currently only tracks posts, not imports.
- There is no INTERACTION_TYPES constant in lib/constants.js; interaction types are plain strings.
- No settings toggle exists for auto-import or import notification behavior.

Key Gaps to Address
1. De-duplication is not persistent
   - IDs include timestamps, so repeated visits will re-import the same post.
   - Storage has no URL-based index to prevent duplicates.

2. Page mode is only detected once
   - SPA navigation (URL changes without full reload) will not trigger new imports.

3. Saved/liked UI layouts differ from feed
   - Instagram/TikTok saved pages are grid-style; current selectors target feed cards.

4. Import noise and AI load
   - Bulk import will trigger notifications and AI queue for each item.

5. Fixed during implementation
   - LinkedIn/TikTok click handlers now use captureInteraction() instead of handleInteraction().

Recommended Approach
Reuse and extend the existing BasePlatformTracker flow instead of adding parallel logic. Add robust URL change detection, persistent de-duplication, and page-specific selectors for saved/liked layouts. Gate imports behind a settings toggle and reduce notification/AI churn.

Implementation Strategy
1. Settings and UX gate
   - Add a settings flag: autoImportSavedPages (default false).
   - Optional: suppressImportNotifications, skipAIForImports.
   - Add toggle(s) to the dashboard settings modal.

2. Page mode detection per platform
   - Instagram: /{username}/saved/ -> saved.
   - LinkedIn: /my-items/saved-posts/ -> saved.
   - TikTok: /@{username}/favorites -> favorites, /@{username}/liked -> likes (if public).
   - Twitter: keep /i/bookmarks and /{username}/likes.

3. SPA navigation support
   - Add URL change detection in BasePlatformTracker (history pushState/replaceState + popstate, or periodic URL polling).
   - Re-run detectPageMode() on URL changes and trigger import when entering saved/liked pages.

4. Bulk capture trigger and throttling
   - When pageMode is saved/liked and autoImportSavedPages is enabled:
     - Trigger bulkCaptureVisiblePosts after page load.
     - Trigger bulk capture on new posts via MutationObserver with debounce.

5. Persistent de-duplication
   - Add a stable key (platform + canonical post URL) and check storage before save.
   - Use an index map in storage for fast lookup; avoid full scans on every import.
   - Concrete schema change:
     - Add interaction.contentKey (string) computed in BasePlatformTracker.
     - Add chrome.storage.local key: interactionIndex = { [contentKey]: interactionId }.
     - On save: if interactionIndex[contentKey] exists, skip or update existing (no duplicate).
     - On delete: remove interactionIndex[contentKey].
     - On update: if contentKey changes, move index entry.
   - Canonical URL strategy:
     - Normalize per platform (strip tracking query params, normalize hostname, remove trailing slash).
     - Fall back to raw URL when canonicalization is unclear.
   - Files to touch:
     - content-scripts/shared/content-extractor.js: add normalizeUrlForKey(url, platform).
     - content-scripts/shared/base-tracker.js: compute contentKey for captureInteraction/captureImportedInteraction.
     - lib/storage/interaction-storage.js: maintain interactionIndex and skip duplicates.
     - lib/storage-manager.js: wire through updated save/update/delete to keep index consistent.

6. Interaction type mapping
   - Use pageMode -> interactionType mapping already in BasePlatformTracker.
   - Keep importedFrom for traceability; optionally add source: 'import'.

7. Platform-specific selectors for saved pages
   - Instagram: add selectors for saved grid tiles; if content extraction is limited, import URL + thumbnail as best-effort.
     - Draft selectors to add:
       - SAVED_GRID_ITEM: 'article a[href*="/p/"]', 'article a[href*="/reel/"]', 'div[role="main"] a[href*="/p/"]'
       - SAVED_GRID_IMAGE: 'img[alt]:not([alt=""])', 'img[srcset]', 'img[src]'
     - Extraction on saved grid: url from link href, text empty, imageUrls from tile.
   - TikTok: add selectors for favorites/liked grid and tiles.
     - Draft selectors to add:
       - PROFILE_GRID_ITEM: 'div[data-e2e="user-post-item"]', 'div[data-e2e="user-liked-item"]', 'div[data-e2e="user-favorite-item"]', 'a[href*="/video/"]'
       - PROFILE_GRID_LINK: 'a[href*="/video/"]'
       - PROFILE_GRID_THUMB: 'img', 'picture img'
     - Extraction on grid: url from link, text empty, thumbnail as imageUrls.
   - LinkedIn/Twitter: reuse feed selectors, validate against saved pages.
   - Consider pageMode-aware selectors:
     - getPostContainerSelectors() branches on this.pageMode and returns SAVED_* selectors when needed.
   - Consider pageMode-aware extraction:
     - extractContent() uses this.pageMode to choose feed vs saved-grid extraction paths.

8. Notifications and AI processing
   - Show one summary notification after bulk import rather than per item.
   - Optionally skip AI queue for imports or batch them to avoid spikes.

Phased Rollout
Phase 1: Passive import on saved/liked pages
- URL change detection
- Auto-import toggle
- De-duplication
- Page-specific selectors

Phase 2 (optional): Active import
- "Import All" button overlay and auto-scroll
- Enhanced progress reporting

Summary of Priorities
Feature	Complexity	Priority
URL change detection	Low	High
Persistent de-duplication	Medium	High
Saved/liked selectors	Medium	High
Settings gate	Low	High
Bulk capture throttling	Low	High
Import notifications/AI control	Medium	Medium
Auto-scroll import	High	Low

Popup Pause/Resume + UX/UI Plan (New Requirement)
Goals
- Add a pause/resume control for auto-import in the extension popup (not the dashboard/full-page view).
- Improve popup UX/UI to make status + controls clear and faster to scan.

Behavior Plan
1. Add a new import state flag
   - Add settings.autoImportPaused (default false).
   - Auto-import runs only when autoImportSavedPages === true and autoImportPaused === false.
   - If paused, cancel any scheduled bulk-capture timers.

2. Enable live state updates in content scripts
   - BasePlatformTracker listens to chrome.storage.onChanged for settings changes.
   - Update this.settings when autoImportPaused/autoImportSavedPages change.
   - On resume, if pageMode is saved/liked, trigger a debounced bulk import.

3. Popup control + status API
   - Add a new popup UI section: "Auto-Import" with a pause/resume toggle button.
   - Add popup -> content-script query:
     - New message type: GET_IMPORT_STATUS (returns pageMode, autoImportSavedPages, autoImportPaused).
   - Popup shows:
     - Active/paused status.
     - Whether current tab is on a saved/liked page.
     - Disabled state if not on supported site or no content script.

4. Settings write path
   - Popup uses UPDATE_SETTINGS to toggle autoImportPaused (and optionally autoImportSavedPages).
   - Keep dashboard settings for long-term preferences; popup acts as quick control.

UX/UI Plan for Popup
1. Visual direction
   - Replace the current purple gradient with a warmer, neutral palette (no purple bias).
   - Introduce CSS variables for color + spacing consistency.
   - Use a distinctive font (e.g., "Space Grotesk" or "IBM Plex Sans") with a local fallback.

2. Layout changes
   - Add an "Auto-Import" card near the top with:
     - Status pill (Active / Paused / Off).
     - Primary toggle button (Pause/Resume).
     - Short helper text (e.g., "Only runs on saved/liked pages").
   - Compact the stats row and give more room to recent items.

3. Micro-interactions
   - Button press state and subtle hover glow.
   - Small animated status indicator when auto-import is active.

4. Accessibility & clarity
   - Use clear labels and color contrast for status states.
   - Provide disabled copy when auto-import is unavailable.

Files to Touch (Expected)
- popup/popup.html (add Auto-Import section)
- popup/popup.css (new visual system, layout polish)
- popup/popup.js (status query + toggle)
- lib/storage/settings-storage.js (autoImportPaused default)
- content-scripts/shared/base-tracker.js (listen for storage changes; use paused flag)
- lib/constants.js + content-scripts/shared/base-tracker.js (add message type for GET_IMPORT_STATUS)
- background/service-worker.js (optional: forward settings update or resolve GET_SETTINGS)

Open Questions
- Should pause be global (all tabs) or per-tab? (Default plan: global via settings.)
- Should the popup toggle autoImportSavedPages as well, or only pause/resume?
