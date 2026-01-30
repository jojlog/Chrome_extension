// Threads DOM Selectors
const ThreadsSelectors = {
  // Post containers
  POST_CONTAINER: [
    'article[role="article"]',
    'article',
    'div[role="article"]',
    'div[data-pressable-container="true"]',
    'div[data-testid="thread"]',
    'div[data-testid="post-container"]',
    'div[data-testid="post"]'
  ],

  // Interaction buttons
  LIKE_BUTTON: [
    '[data-testid="like"]',
    '[data-testid="unlike"]',
    'button[aria-label*="Like"]',
    'button[aria-label*="Unlike"]',
    'button[aria-label*="Liked"]'
  ],

  REPOST_BUTTON: [
    '[data-testid="repost"]',
    '[data-testid="unrepost"]',
    'button[aria-label*="Repost"]',
    'button[aria-label*="Reposted"]',
    'button[aria-label*="Undo repost"]'
  ],

  QUOTE_BUTTON: [
    '[data-testid="quote"]',
    'button[aria-label*="Quote"]',
    'button[aria-label*="Quote post"]'
  ],

  SAVE_BUTTON: [
    '[data-testid="save"]',
    '[data-testid="unsave"]',
    'button[aria-label*="Save"]',
    'button[aria-label*="Saved"]',
    'button[aria-label*="Unsave"]',
    'button[aria-label*="Remove from saved"]'
  ],

  // Content elements
  POST_TEXT: [
    '[data-testid="post-text"]',
    'div[dir="auto"] span',
    'div[dir="auto"]',
    'article div[lang]',
    'div[lang]'
  ],

  POST_IMAGES: [
    'img[src]',
    'article img'
  ],

  POST_VIDEO: [
    'video',
    'article video'
  ],

  // Post link
  POST_LINK: [
    'a[href*="/post/"]',
    'a[href*="/t/"]',
    'a[href*="/thread/"]'
  ],

  // Author information
  AUTHOR: [
    'a[href^="/@"]',
    'a[role="link"][href^="/@"]',
    '[data-testid="user-name"] a',
    '[data-testid="user-name"]'
  ],

  AUTHOR_NAME: [
    '[data-testid="user-name"] span',
    'a[href^="/@"] span',
    'h2 span',
    'h3 span'
  ],

  // Metadata
  DATE: [
    'time[datetime]',
    'time'
  ],

  LIKES: [
    '[data-testid="like"] span',
    'button[aria-label*="Like"] span'
  ],

  REPOSTS: [
    '[data-testid="repost"] span',
    'button[aria-label*="Repost"] span'
  ],

  REPLIES: [
    '[data-testid="reply"] span',
    'button[aria-label*="Reply"] span'
  ],

  ACTIONS_GROUP: [
    '[role="group"]',
    '[data-testid="post-actions"]'
  ],

  PROFILE_TABS: [
    '[role="tab"]',
    '[data-testid="profile-tab"]',
    'a[role="tab"]'
  ]
};

// Make available globally
window.ThreadsSelectors = ThreadsSelectors;
