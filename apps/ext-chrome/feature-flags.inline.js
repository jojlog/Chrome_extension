/**
 * Inline feature-flag adapter for Chrome extension runtime.
 *
 * Source of truth: packages/core/feature-flags.js
 * Keep this file synchronized manually until a bundler (esbuild/rollup) is introduced.
 */
(function () {
  'use strict';

  var PLATFORM = 'ext-chrome';

  var FEATURES = Object.freeze({
    CORE_TRACKING: 'core-tracking',
    AUTO_IMPORT: 'auto-import',
    AUTO_SCROLL_IMPORT: 'auto-scroll-import',
    DASHBOARD_UI: 'dashboard-ui',
    EXPORT_IMPORT: 'export-import',
    AI_CATEGORIZATION: 'ai-categorization',
    ACCOUNT_MANAGEMENT: 'account-management',
    POST_PREVIEW_CAPTURE: 'post-preview-capture',
    INSTAGRAM_CAPTION_FETCH: 'instagram-caption-fetch',
    YOUTUBE_CAPTION_FETCH: 'youtube-caption-fetch',
    TIKTOK_FEED_HOOK: 'tiktok-feed-hook'
  });

  var FLAGS_BY_PLATFORM = Object.freeze({
    'ext-chrome': Object.freeze({
      'core-tracking': true,
      'auto-import': true,
      'auto-scroll-import': true,
      'dashboard-ui': true,
      'export-import': true,
      'ai-categorization': true,
      'account-management': true,
      'post-preview-capture': true,
      'instagram-caption-fetch': true,
      'youtube-caption-fetch': true,
      'tiktok-feed-hook': true
    }),
    'ext-safari': Object.freeze({
      'core-tracking': false,
      'auto-import': false,
      'auto-scroll-import': false,
      'dashboard-ui': false,
      'export-import': false,
      'ai-categorization': false,
      'account-management': false,
      'post-preview-capture': false,
      'instagram-caption-fetch': false,
      'youtube-caption-fetch': false,
      'tiktok-feed-hook': false
    }),
    web: Object.freeze({
      'core-tracking': false,
      'auto-import': false,
      'auto-scroll-import': false,
      'dashboard-ui': false,
      'export-import': false,
      'ai-categorization': false,
      'account-management': false,
      'post-preview-capture': false,
      'instagram-caption-fetch': false,
      'youtube-caption-fetch': false,
      'tiktok-feed-hook': false
    }),
    'ios-app': Object.freeze({
      'core-tracking': false,
      'auto-import': false,
      'auto-scroll-import': false,
      'dashboard-ui': false,
      'export-import': false,
      'ai-categorization': false,
      'account-management': false,
      'post-preview-capture': false,
      'instagram-caption-fetch': false,
      'youtube-caption-fetch': false,
      'tiktok-feed-hook': false
    })
  });

  var activeFlags = FLAGS_BY_PLATFORM[PLATFORM] || {};

  globalThis.ContentTrackerFlags = Object.freeze({
    platform: PLATFORM,
    FEATURES: FEATURES,
    isEnabled: function isEnabled(featureName) {
      return Boolean(activeFlags[featureName]);
    },
    getAll: function getAll() {
      return Object.assign({}, activeFlags);
    }
  });
})();
