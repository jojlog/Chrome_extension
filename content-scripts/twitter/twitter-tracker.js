// Twitter Tracker - Tracks interactions on Twitter/X

// Defensive checks for required dependencies
if (!window.BasePlatformTracker) {
  throw new Error('TwitterTracker: BasePlatformTracker not loaded. Check script order in manifest.json');
}
if (!window.ContentExtractor) {
  throw new Error('TwitterTracker: ContentExtractor not loaded. Check script order in manifest.json');
}
if (!window.TwitterSelectors) {
  throw new Error('TwitterTracker: TwitterSelectors not loaded. Check script order in manifest.json');
}

// NOTE: Classes are already declared in their source files which run before this file.

class TwitterTracker extends BasePlatformTracker {
  constructor() {
    super('twitter');
  }

  /**
   * Setup event listeners for Twitter interactions
   */
  setupEventListeners() {
    // Use event delegation for dynamic content
    document.addEventListener('click', (e) => {
      this.handleClick(e);
    }, true);

    console.log('Twitter event listeners set up');
  }

  /**
   * Handle click events
   * @param {Event} e - Click event
   */
  handleClick(e) {
    const target = e.target;

    // Check for like button
    if (this.isLikeButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isLiking(target)) {
        setTimeout(() => this.captureInteraction('like', postElement), 100);
      }
    }

    // Check for retweet button
    if (this.isRetweetButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement) {
        // Check after a short delay if actually retweeted (menu might appear)
        setTimeout(() => {
          if (this.wasRetweeted(target)) {
            this.captureInteraction('retweet', postElement);
          }
        }, 500);
      }
    }

    // Check for bookmark button
    if (this.isBookmarkButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isBookmarking(target)) {
        setTimeout(() => this.captureInteraction('save', postElement), 100);
      }
    }
  }

  /**
   * Get post container selectors (required by base class)
   * @returns {Array<string>}
   */
  getPostContainerSelectors() {
    return TwitterSelectors.POST_CONTAINER;
  }

  async init() {
    await super.init();
    this.scanExistingPosts();
    console.log(`${this.platform} tracker initialized`);
  }
  /**
   * Check if element is a like button
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isLikeButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'like' || testId === 'unlike') {
        return true;
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Like') || ariaLabel.includes('Liked'))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if element is a retweet button
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isRetweetButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'retweet' || testId === 'unretweet') {
        return true;
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Repost') || ariaLabel.includes('Reposted') || ariaLabel.includes('Retweet'))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if element is a bookmark button
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isBookmarkButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'bookmark' || testId === 'removeBookmark') {
        return true;
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.includes('Bookmark')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if the button click is a "liking" action (not unliking)
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isLiking(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'like') return true;
      if (testId === 'unlike') return false;

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.includes('Liked')) return false;
    }
    return true;
  }

  /**
   * Check if the button click is a "bookmarking" action (not removing)
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isBookmarking(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'bookmark') return true;
      if (testId === 'removeBookmark') return false;

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.includes('Remove')) return false;
    }
    return true;
  }

  /**
   * Check if tweet was actually retweeted (after menu interaction)
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  wasRetweeted(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'unretweet') return true; // Changed to unretweet means it was retweeted

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.includes('Reposted')) return true;
    }
    return false;
  }

  /**
   * Find the post element containing the button
   * @param {HTMLElement} button
   * @returns {HTMLElement|null}
   */
  findPostElement(button) {
    return button.closest('article[data-testid="tweet"]') ||
      button.closest('article[role="article"]');
  }

  /**
   * Find all posts on the page
   * @returns {Array<HTMLElement>}
   */
  findAllPosts() {
    const posts = [];
    for (const selector of TwitterSelectors.POST_CONTAINER) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        posts.push(...Array.from(found));
        break;
      }
    }
    return posts;
  }

  /**
   * Find posts in a specific element
   * @param {HTMLElement} element
   * @returns {Array<HTMLElement>}
   */
  findPostsInElement(element) {
    const posts = [];
    for (const selector of TwitterSelectors.POST_CONTAINER) {
      const found = element.querySelectorAll(selector);
      if (found.length > 0) {
        posts.push(...Array.from(found));
        break;
      }
    }
    return posts;
  }

  /**
   * Check if element is a post
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isPostElement(element) {
    return element.tagName === 'ARTICLE' &&
      (element.getAttribute('data-testid') === 'tweet' ||
        element.getAttribute('role') === 'article');
  }

  /**
   * Extract post URL
   * @param {HTMLElement} postElement
   * @returns {string}
   */
  extractPostUrl(postElement) {
    const link = ContentExtractor.findWithFallback(postElement, TwitterSelectors.POST_LINK);
    return link ? link.href : window.location.href;
  }

  /**
   * Extract content from post
   * @param {HTMLElement} postElement
   * @returns {Object}
   */
  extractContent(postElement) {
    // Extract text
    const textElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.POST_TEXT);
    const text = textElement ? ContentExtractor.extractText(textElement) : '';

    // Extract images
    const imageUrls = ContentExtractor.extractImageUrls(
      postElement,
      TwitterSelectors.POST_IMAGES.join(',')
    );

    // Extract video
    const videoElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.POST_VIDEO);
    const videoUrl = videoElement ? (videoElement.src || videoElement.currentSrc) : null;

    // Extract URL
    const url = this.extractPostUrl(postElement);

    // Extract hashtags
    const hashtags = ContentExtractor.extractHashtags(text);

    // Extract mentions
    const mentions = ContentExtractor.extractMentions(text);

    return {
      text: ContentExtractor.cleanText(text),
      imageUrls: imageUrls,
      videoUrl: videoUrl,
      url: url,
      hashtags: hashtags,
      mentions: mentions
    };
  }

  /**
   * Extract metadata from post
   * @param {HTMLElement} postElement
   * @returns {Object}
   */
  extractMetadata(postElement) {
    // Extract author
    const authorElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.AUTHOR);
    const authorNameElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.AUTHOR_NAME);

    const author = authorNameElement ?
      ContentExtractor.extractText(authorNameElement) :
      (authorElement ? ContentExtractor.extractText(authorElement) : 'Unknown');

    const authorUrl = authorElement ? authorElement.href : '';

    // Extract date
    const dateElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.DATE);
    const date = dateElement ? ContentExtractor.extractDate(dateElement) : new Date().toISOString();

    // Extract likes
    const likesElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.LIKES);
    const likesText = likesElement ? ContentExtractor.extractText(likesElement) : '0';
    const likes = ContentExtractor.parseEngagementCount(likesText);

    // Extract retweets
    const retweetsElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.RETWEETS);
    const retweetsText = retweetsElement ? ContentExtractor.extractText(retweetsElement) : '0';
    const retweets = ContentExtractor.parseEngagementCount(retweetsText);

    // Extract replies
    const repliesElement = ContentExtractor.findWithFallback(postElement, TwitterSelectors.REPLIES);
    const repliesText = repliesElement ? ContentExtractor.extractText(repliesElement) : '0';
    const replies = ContentExtractor.parseEngagementCount(repliesText);

    return {
      author: author,
      authorUrl: authorUrl,
      date: date,
      likes: likes,
      comments: replies,
      shares: retweets
    };
  }

  /**
   * Extract the currently logged-in user on Twitter/X
   * @returns {Object|null} User info
   */
  extractLoggedInUser() {
    try {
      // Try account switcher button (most reliable)
      const accountButton = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (accountButton) {
        // The button contains avatar and username info
        const usernameSpan = accountButton.querySelector('div[dir="ltr"] span');
        const displayNameSpan = accountButton.querySelector('div[dir="auto"] span');

        if (usernameSpan) {
          const username = usernameSpan.textContent?.replace('@', '').trim();
          const fullName = displayNameSpan?.textContent?.trim();

          if (username) {
            return {
              username: username,
              fullName: fullName || null,
              id: null // Twitter doesn't expose user ID in DOM easily
            };
          }
        }
      }

      // Fallback: Try profile link in nav
      const profileLink = document.querySelector('nav a[href^="/"][data-testid="AppTabBar_Profile_Link"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        const username = href?.replace('/', '').trim();
        if (username) {
          return { username, fullName: null, id: null };
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting logged-in user:', error);
      return null;
    }
  }

  /**
   * Detect the current page mode for Twitter/X
   * @returns {string|null} 'bookmarks', 'likes', or null
   */
  detectPageMode() {
    const url = window.location.href;

    // Twitter bookmarks: x.com/i/bookmarks or twitter.com/i/bookmarks
    if (url.includes('/i/bookmarks')) {
      return 'bookmarks';
    }

    // Twitter likes: x.com/{username}/likes
    if (url.match(/\/([\w]+)\/likes\/?$/)) {
      return 'likes';
    }

    return null;
  }

  getScrollContainerOverride() {
    const candidates = [
      '[data-testid="primaryColumn"]',
      'main[role="main"]',
      '[role="main"]',
      '[aria-label*="Timeline"]',
      'section[aria-label*="Timeline"]'
    ];

    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }
}

// Initialize tracker when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TwitterTracker();
  });
} else {
  new TwitterTracker();
}

console.log('Twitter tracker script loaded');
