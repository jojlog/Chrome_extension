// TikTok DOM Selectors
const TikTokSelectors = {
  // Post/video containers
  POST_CONTAINER: [
    'article[data-e2e="recommend-list-item-container"]',
    'div[data-e2e="recommend-list-item-container"]',
    'article[class*="ArticleItemContainer"]',
    'div.DivItemContainerV2',
    'div[class*="DivItemContainer"]'
  ],

  // Profile grids (favorites/liked)
  PROFILE_GRID_ITEM: [
    'div[data-e2e="user-post-item"]',
    'div[data-e2e="user-liked-item"]',
    'div[data-e2e="user-favorite-item"]',
    'div[data-e2e="user-favourite-item"]',
    'div[data-e2e*="user-liked-item"]',
    'div[data-e2e*="user-favorite-item"]',
    'div[data-e2e*="user-favourite-item"]',
    'div[data-e2e*="user-post-item"]',
    'a[data-e2e*="user-liked-item"]',
    'a[data-e2e*="user-favorite-item"]',
    'a[data-e2e*="user-favourite-item"]',
    'a[href*="/video/"]'
  ],

  PROFILE_GRID_ROOT: [
    '[data-e2e="user-post-item-list"]',
    '[data-e2e="user-liked-item-list"]',
    '[data-e2e="user-favorite-item-list"]',
    '[data-e2e="user-favourite-item-list"]',
    '[data-e2e*="user-post-item-list"]',
    '[data-e2e*="user-liked-item-list"]',
    '[data-e2e*="user-favorite-item-list"]',
    '[data-e2e*="user-favourite-item-list"]'
  ],

  PROFILE_GRID_LINK: [
    'a[href*="/video/"]'
  ],

  PROFILE_GRID_THUMB: [
    'img',
    'picture img'
  ],

  // Interaction buttons
  LIKE_BUTTON: [
    'button[data-e2e="like-icon"]',
    'button[data-e2e="browse-like-icon"]',
    'button[aria-label*="like"]',
    'button[class*="LikeButton"]'
  ],

  FAVORITE_BUTTON: [
    'button[data-e2e="video-save-button"]',
    'button[aria-label*="Favorite"]',
    'button[aria-label*="Add to favorites"]'
  ],

  COMMENT_BUTTON: [
    'button[data-e2e="comment-icon"]',
    'button[data-e2e="browse-comment"]',
    'button[aria-label*="comment"]'
  ],

  SHARE_BUTTON: [
    'button[data-e2e="share-icon"]',
    'button[data-e2e="browse-share"]',
    'button[aria-label*="Share"]'
  ],

  // Content elements
  POST_TEXT: [
    'div[data-e2e="browse-video-desc"]',
    'div[data-e2e="video-desc"]',
    'span[class*="SpanText"]',
    'div.tiktok-j2a19r-SpanText'
  ],

  POST_VIDEO: [
    'video[data-e2e="video-player"]',
    'video.video-player',
    'video'
  ],

  // Post link
  POST_LINK: [
    'a[href*="/video/"]',
    'a[data-e2e="video-link"]'
  ],

  // Author information
  AUTHOR: [
    'a[data-e2e="browse-username"]',
    'span[data-e2e="browse-username"]',
    'a[class*="AuthorLink"]'
  ],

  AUTHOR_LINK: [
    'a[data-e2e="browse-username"]',
    'a[href*="/@"]'
  ],

  // Metadata
  LIKES: [
    'strong[data-e2e="like-count"]',
    'strong[data-e2e="browse-like-count"]',
    'button[data-e2e="like-icon"] strong'
  ],

  COMMENTS: [
    'strong[data-e2e="comment-count"]',
    'strong[data-e2e="browse-comment-count"]',
    'button[data-e2e="comment-icon"] strong'
  ],

  SHARES: [
    'strong[data-e2e="share-count"]',
    'strong[data-e2e="undefined-count"]'
  ],

  // Action bar
  ACTIONS_BAR: [
    'div[data-e2e="video-action-bar"]',
    'div[class*="DivActionItemContainer"]'
  ]
};

// Make available globally
window.TikTokSelectors = TikTokSelectors;
