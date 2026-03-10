/**
 * @module packages/core/feature-flags
 * Canonical feature-flag source of truth across platforms.
 *
 * NOTE:
 * - This file is ESM and intended for shared/business logic.
 * - Chrome MV3 content scripts cannot import ESM directly.
 * - Keep apps/ext-chrome/feature-flags.inline.js manually synced until bundling is introduced.
 */

export const PLATFORM = Object.freeze({
  EXT_CHROME: 'ext-chrome',
  EXT_SAFARI: 'ext-safari',
  WEB: 'web',
  IOS_APP: 'ios-app'
});

export const FEATURES = Object.freeze({
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

/** @type {Record<string, Record<string, boolean>>} */
const FLAG_DEFAULTS = {
  [FEATURES.CORE_TRACKING]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.AUTO_IMPORT]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.AUTO_SCROLL_IMPORT]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.DASHBOARD_UI]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.EXPORT_IMPORT]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.AI_CATEGORIZATION]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.ACCOUNT_MANAGEMENT]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.POST_PREVIEW_CAPTURE]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.INSTAGRAM_CAPTION_FETCH]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.YOUTUBE_CAPTION_FETCH]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  },
  [FEATURES.TIKTOK_FEED_HOOK]: {
    [PLATFORM.EXT_CHROME]: true,
    [PLATFORM.EXT_SAFARI]: false,
    [PLATFORM.WEB]: false,
    [PLATFORM.IOS_APP]: false
  }
};

let currentPlatform = PLATFORM.EXT_CHROME;
const overrides = {};

export function setPlatform(platform) {
  currentPlatform = platform;
}

export function isEnabled(featureName) {
  if (featureName in overrides) {
    return overrides[featureName];
  }

  const table = FLAG_DEFAULTS[featureName];
  if (!table) {
    return false;
  }

  return table[currentPlatform] ?? false;
}

export function setOverride(featureName, value) {
  overrides[featureName] = Boolean(value);
}

export function clearOverrides() {
  for (const key of Object.keys(overrides)) {
    delete overrides[key];
  }
}

export function getAllFlags() {
  return JSON.parse(JSON.stringify(FLAG_DEFAULTS));
}

export function getFlagsForPlatform(platform) {
  const byFeature = {};
  for (const featureName of Object.keys(FLAG_DEFAULTS)) {
    byFeature[featureName] = FLAG_DEFAULTS[featureName][platform] ?? false;
  }
  return byFeature;
}
