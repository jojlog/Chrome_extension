Auto-Import + Auto-Scroll Overview (Current Implementation)

This document describes how auto-import and auto-scroll work in the extension and the overall program workflow. It is intended for safety review (e.g., ensuring behavior is user-initiated and non-abusive).

Auto-Import (Saved/Liked Pages)
1) Entry conditions
- Auto-import only runs on saved/liked pages (pageMode != 'feed').
- It is gated by settings:
  - settings.autoImportSavedPages must be true.
  - settings.autoImportPaused must be false.

2) Page mode detection
- On content script init, detectPageMode() runs and sets pageMode.
- URL changes are observed (pushState/replaceState/popstate), and detectPageMode() is re-run. If the page mode changes to a saved/liked page, auto-import can start.

3) Triggers
- Initial trigger: on load, if auto-import is allowed, a delayed bulk import runs.
- MutationObserver trigger: newly added posts schedule a debounced bulk import.
- Popup trigger: the popup can send TRIGGER_AUTO_IMPORT, which schedules a bulk import immediately on the active tab.

4) Capture logic
- bulkCaptureVisiblePosts() scans for post containers and imports only posts that are visible in the viewport.
- For each post, captureImportedInteraction() builds an interaction payload and sends it to the background service worker.

5) De-duplication
- Each interaction includes a contentKey (stable key based on platform + normalized URL).
- A storage index (interactionIndex) prevents duplicate saves across repeated visits.

6) Notifications and AI
- Imported items can optionally suppress notifications and skip AI categorization, controlled by settings:
  - settings.suppressImportNotifications
  - settings.skipAIForImports

7) Summary
- Auto-import is passive; it only imports visible items on saved/liked pages, triggered by load, DOM changes, or user action.

Auto-Scroll Import (Saved/Liked Only)
1) Entry conditions
- Auto-scroll is only allowed on saved/liked pages. If pageMode is 'feed', start is rejected.

2) Start/Control
- Popup button sends START_AUTO_SCROLL_IMPORT to the content script.
- Content script shows an overlay with status and controls (Pause/Resume/Stop).

3) Loop behavior
- Runs a scroll loop with a fixed step delay (~1000ms).
- Each step:
  - Scrolls down by ~90% of viewport height.
  - Waits stepDelayMs to allow content to render.
  - Calls bulkCaptureVisiblePosts({ force: true, suppressSummary: true }).
- Imported count is tracked in state and shown in the overlay.

4) Stop conditions (defaults)
- Max items: 50
- Max duration: 5 minutes
- No new content detected for 3 consecutive checks

5) Overlay
- Floating in-page card with:
  - Status pill: Running / Paused / Stopped / Completed
  - Imported count
  - Pause / Resume / Stop buttons

Program Workflow (High-Level)
1) Extension startup
- Background service worker initializes storage and AI categorizer on install/startup.

2) Content script lifecycle
- Content scripts load on supported domains (Instagram, X/Twitter, LinkedIn, TikTok).
- Base tracker initializes:
  - waitForPageLoad
  - load settings
  - detectPageMode
  - setup MutationObserver
  - setup click handlers
  - setup URL change listener
  - optional auto-import trigger (if on saved/liked pages and enabled)

3) User interactions (real-time)
- Clicks on like/save/retweet are captured and saved immediately.
- Each interaction is stored with a stable contentKey and indexed for de-duplication.

4) Auto-import flows
- Auto-import (passive) is triggered by:
  - Page load on saved/liked pages
  - DOM mutations (new posts)
  - Popup manual trigger
- Auto-scroll import is explicitly user-initiated from the popup and runs until stop conditions.

5) Storage + AI
- Background service worker saves interactions to chrome.storage.local.
- AI categorization runs asynchronously via a queue unless disabled for imports.

6) UI surfaces
- Popup:
  - Shows stats, recent items, auto-import status.
  - Controls auto-import and auto-scroll start.
- Dashboard:
  - Full content view, filters, categories, settings.
- In-page overlays:
  - Status popup for saves.
  - Auto-scroll overlay for import progress.

Safety / Ban Risk Considerations (Behavioral Summary)
- Auto-import only runs on saved/liked pages and only imports visible posts.
- Auto-scroll is user-initiated and bounded by strict limits (50 items or 5 minutes).
- Scroll pacing includes delays to allow rendering and avoid aggressive requests.
- De-duplication prevents repeated saves and reduces repeated processing.
