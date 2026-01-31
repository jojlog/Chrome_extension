// YouTube DOM Selectors
const YouTubeSelectors = {
  // Post containers
  POST_CONTAINER: [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-playlist-video-renderer',
    'ytd-reel-item-renderer',
    'ytd-reel-video-renderer',
    'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer',
    'ytd-item-section-renderer ytd-video-renderer',
    'ytd-two-column-browse-results-renderer ytd-video-renderer'
  ],

  // Interaction buttons
  LIKE_BUTTON: [
    'ytd-toggle-button-renderer[is-icon-button][aria-label*="like"] button',
    'button[aria-label*="like this video"]',
    'button[aria-label*="Like"]',
    'ytd-like-button-renderer button',
    'ytd-menu-renderer ytd-toggle-button-renderer button[aria-pressed]'
  ],

  SAVE_BUTTON: [
    'ytd-menu-renderer button[aria-label*="Save"]',
    'button[aria-label*="Save"]',
    'tp-yt-paper-button[aria-label*="Save"]',
    'ytd-button-renderer[aria-label*="Save"] button'
  ],

  WATCH_LATER_MENU_ITEM: [
    'ytd-playlist-add-to-option-renderer[play-list-name="Watch later"]',
    'ytd-playlist-add-to-option-renderer[aria-label*="Watch later"]',
    'tp-yt-paper-item[aria-label*="Watch later"]'
  ],

  // Content elements
  POST_TITLE: [
    '#video-title',
    'a#video-title',
    'ytd-video-renderer #video-title',
    'ytd-compact-video-renderer #video-title',
    'ytd-playlist-video-renderer #video-title',
    'ytd-rich-item-renderer #video-title',
    'ytd-watch-metadata h1',
    'ytd-watch-metadata h1 yt-formatted-string',
    'h1.title',
    'h1.title yt-formatted-string',
    '#title h1',
    '#title yt-formatted-string'
  ],

  POST_TEXT: [
    '#description',
    'yt-formatted-string#description',
    'ytd-expander #content #description',
    'ytd-expander #content',
    '#description-inline-expander',
    '#description-text',
    'yt-formatted-string#description-text'
  ],

  POST_IMAGES: [
    'ytd-thumbnail img',
    'img#img',
    'img[src*="ytimg"]'
  ],

  POST_VIDEO: [
    'video'
  ],

  POST_LINK: [
    'a#video-title',
    'a[href*="watch?v="]',
    'a[href*="/shorts/"]'
  ],

  AUTHOR: [
    '#channel-name a',
    'ytd-channel-name a',
    'ytd-video-renderer #channel-name a',
    'ytd-compact-video-renderer #channel-name a',
    'ytd-playlist-video-renderer #channel-name a'
  ],

  AUTHOR_NAME: [
    '#channel-name',
    'ytd-channel-name',
    'ytd-video-renderer #channel-name',
    'ytd-compact-video-renderer #channel-name'
  ],

  DATE: [
    '#info-strings yt-formatted-string',
    'ytd-video-primary-info-renderer #date',
    'ytd-video-renderer #metadata-line span',
    'ytd-compact-video-renderer #metadata-line span'
  ],

  LIKES: [
    'ytd-toggle-button-renderer[is-icon-button][aria-label*="like"] #text',
    'ytd-like-button-renderer #text',
    'button[aria-label*="like this video"] #text'
  ],

  REPLIES: [
    'ytd-comment-thread-renderer'
  ]
};

// Make available globally
window.YouTubeSelectors = YouTubeSelectors;
