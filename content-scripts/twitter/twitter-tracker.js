// Twitter/X Tracker - Tracks interactions on Twitter
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
