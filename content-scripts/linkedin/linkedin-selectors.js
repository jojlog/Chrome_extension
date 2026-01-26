// LinkedIn DOM Selectors
const LinkedInSelectors = {
  // Post containers
  POST_CONTAINER: [
    'div.feed-shared-update-v2',
    'div[data-id*="urn:li:activity"]',
    'article.feed-shared-update-v2__content',
    'div.occludable-update'
  ],

  // Interaction buttons
  LIKE_BUTTON: [
    'button[aria-label*="Like"]',
    'button[aria-label*="React"]',
    'button.react-button',
    'button[data-control-name*="like"]'
  ],

  SAVE_BUTTON: [
    'button[aria-label*="Save"]',
    'button[aria-label*="Unsave"]',
    'button[data-control-name*="save"]'
  ],

  COMMENT_BUTTON: [
    'button[aria-label*="Comment"]',
    'button[data-control-name*="comment"]'
  ],

  SHARE_BUTTON: [
    'button[aria-label*="Share"]',
    'button[aria-label*="Repost"]',
    'button[data-control-name*="share"]'
  ],

  // Content elements
  POST_TEXT: [
    '.feed-shared-update-v2__description',
    '.feed-shared-text',
    'div[dir="ltr"] span[dir="ltr"]',
    '.update-components-text'
  ],

  POST_IMAGES: [
    '.feed-shared-image__image',
    'img[alt]:not([alt=""])',
    '.update-components-image img'
  ],

  POST_VIDEO: [
    'video',
    '.feed-shared-video video'
  ],

  // Post link
  POST_LINK: [
    'a[href*="/feed/update/"]',
    'a.app-aware-link[href*="activity"]'
  ],

  // Author information
  AUTHOR: [
    '.feed-shared-actor__name',
    'span.update-components-actor__name',
    'a.app-aware-link span[dir="ltr"]'
  ],

  AUTHOR_LINK: [
    '.feed-shared-actor__container-link',
    'a[href*="/in/"]'
  ],

  // Metadata
  DATE: [
    '.feed-shared-actor__sub-description time',
    'time.update-components-actor__sub-description'
  ],

  LIKES: [
    '.social-details-social-counts__reactions-count',
    'button[aria-label*="reaction"] span'
  ],

  COMMENTS: [
    '.social-details-social-counts__comments',
    'button[aria-label*="comment"] span'
  ],

  SHARES: [
    '.social-details-social-counts__shares',
    'button[aria-label*="repost"] span'
  ],

  // Actions group
  ACTIONS_GROUP: [
    '.feed-shared-social-action-bar',
    '.social-details-social-activity'
  ]
};

// Make available globally
window.LinkedInSelectors = LinkedInSelectors;
