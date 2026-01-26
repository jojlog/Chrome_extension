// Twitter/X DOM Selectors
const TwitterSelectors = {
  // Post containers
  POST_CONTAINER: [
    'article[data-testid="tweet"]',
    'article[role="article"]',
    'div[data-testid="cellInnerDiv"] article'
  ],

  // Interaction buttons
  LIKE_BUTTON: [
    '[data-testid="like"]',
    '[data-testid="unlike"]',
    'button[aria-label*="Like"]',
    'button[aria-label*="Liked"]'
  ],

  RETWEET_BUTTON: [
    '[data-testid="retweet"]',
    '[data-testid="unretweet"]',
    'button[aria-label*="Repost"]',
    'button[aria-label*="Reposted"]'
  ],

  BOOKMARK_BUTTON: [
    '[data-testid="bookmark"]',
    '[data-testid="removeBookmark"]',
    'button[aria-label*="Bookmark"]',
    'button[aria-label*="Remove Bookmark"]'
  ],

  REPLY_BUTTON: [
    '[data-testid="reply"]',
    'button[aria-label*="Reply"]'
  ],

  SHARE_BUTTON: [
    'button[aria-label*="Share"]',
    '[data-testid="shareButton"]'
  ],

  // Content elements
  POST_TEXT: [
    '[data-testid="tweetText"]',
    'div[lang] span',
    'article div[dir="auto"] span'
  ],

  POST_IMAGES: [
    '[data-testid="tweetPhoto"] img',
    'article img[alt]:not([alt=""])',
    'div[data-testid="card.wrapper"] img'
  ],

  POST_VIDEO: [
    '[data-testid="videoPlayer"] video',
    'article video',
    'video[src]'
  ],

  // Post link
  POST_LINK: [
    'article a[href*="/status/"]',
    'time + a',
    'article time + a'
  ],

  // Author information
  AUTHOR: [
    '[data-testid="User-Name"] a',
    'article [role="link"][href^="/"]',
    'article a[href^="/"][role="link"]'
  ],

  AUTHOR_NAME: [
    '[data-testid="User-Name"] span',
    'article [dir="ltr"] span'
  ],

  // Metadata
  DATE: [
    'article time',
    'time[datetime]'
  ],

  LIKES: [
    '[data-testid="like"] span[data-testid="app-text-transition-container"]',
    'button[aria-label*="Like"] span',
    '[data-testid="like"] + span'
  ],

  RETWEETS: [
    '[data-testid="retweet"] span[data-testid="app-text-transition-container"]',
    'button[aria-label*="Repost"] span',
    '[data-testid="retweet"] + span'
  ],

  REPLIES: [
    '[data-testid="reply"] span[data-testid="app-text-transition-container"]',
    'button[aria-label*="Reply"] span',
    '[data-testid="reply"] + span'
  ],

  // Action group
  ACTIONS_GROUP: [
    '[role="group"]',
    'article > div > div:last-child [role="group"]'
  ]
};

// Make available globally
window.TwitterSelectors = TwitterSelectors;
