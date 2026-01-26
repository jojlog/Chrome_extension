// Instagram DOM Selectors
// Note: Instagram frequently changes their class names, so we use multiple fallback selectors
const InstagramSelectors = {
  // Post containers
  POST_CONTAINER: [
    'article[role="presentation"]',
    'div[role="dialog"] article',
    'article',
    'div._aatk' // Common Instagram class pattern
  ],

  // Saved grid items
  SAVED_GRID_ITEM: [
    'div[role="main"] article a[href*="/p/"]',
    'div[role="main"] article a[href*="/reel/"]',
    'div[role="main"] a[href*="/p/"]',
    'div[role="main"] a[href*="/reel/"]'
  ],

  SAVED_GRID_LINK: [
    'a[href*="/p/"]',
    'a[href*="/reel/"]'
  ],

  SAVED_GRID_IMAGE: [
    'img[alt]:not([alt=""])',
    'img[srcset]',
    'img[src]'
  ],

  // Interaction buttons
  LIKE_BUTTON: [
    'svg[aria-label*="Like"]',
    'button[aria-label*="Like"]',
    'svg[aria-label*="Unlike"]',
    'button[aria-label*="Unlike"]',
    'span._aamw > button', // Like button wrapper
    'section button:first-child' // First button in actions section
  ],

  SAVE_BUTTON: [
    'svg[aria-label*="Save"]',
    'button[aria-label*="Save"]',
    'svg[aria-label*="Remove"]', // When already saved
    'button[aria-label*="Remove"]',
    'span._aamw > button:last-child' // Save button wrapper
  ],

  COMMENT_BUTTON: [
    'svg[aria-label*="Comment"]',
    'button[aria-label*="Comment"]'
  ],

  SHARE_BUTTON: [
    'svg[aria-label*="Share"]',
    'button[aria-label*="Share"]'
  ],

  // Content elements
  POST_TEXT: [
    'div._a9zs > span',
    'h1._aacl._aacs._aact._aacx._aad6._aade',
    'span._aade', // Caption text
    'div.C4VMK > span', // Alternative caption
    'article h2 + div span',
    'article span[dir="auto"]'
  ],

  POST_IMAGES: [
    'article img[srcset]',
    'article img[src*="instagram"]',
    'div._aagv img', // Image container
    'img[alt]:not([alt=""])'
  ],

  POST_VIDEO: [
    'article video',
    'video[src]',
    'video[playsinline]'
  ],

  // Post link
  POST_LINK: [
    'article a[href*="/p/"]',
    'a[href*="/reel/"]',
    'article time + a', // Link near timestamp
    'header a[role="link"] + a'
  ],

  // Author information
  AUTHOR: [
    'article header a[role="link"]',
    'article header span > a',
    'a[href*="/"]', // Username link
    'header a:first-child'
  ],

  AUTHOR_NAME: [
    'article header a[role="link"] span',
    'article header span',
    'header a span'
  ],

  // Metadata
  DATE: [
    'article time[datetime]',
    'time',
    'a[href*="/p/"] time',
    'a[href*="/reel/"] time'
  ],

  LIKES: [
    'article section button span',
    'section > div > button > span',
    'a[href*="/liked_by/"]',
    'button span[class*=""]' // Likes count
  ],

  COMMENTS: [
    'a[href*="/comments/"]',
    'button span[aria-label*="comment"]',
    'span._ae2s' // Comment count
  ],

  // Action sections
  ACTIONS_SECTION: [
    'article section',
    'div._ae2t', // Actions container
    'article > div:nth-child(2) section'
  ]
};

// Make available globally
window.InstagramSelectors = InstagramSelectors;
