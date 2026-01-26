// Instagram Tracker - Tracks interactions on Instagram
class InstagramTracker extends BasePlatformTracker {
  constructor() {
    super('instagram');
  }

  async init() {
    await super.init();
    this.scanExistingPosts();
    console.log(`${this.platform} tracker initialized`);
  }

  /**
   * Setup event listeners for Instagram interactions
   */
  setupEventListeners() {
    // Use event delegation for dynamic content
    document.addEventListener('click', (e) => {
      this.handleClick(e);
    }, true); // Use capture phase to catch events early

    console.log('Instagram event listeners set up');
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

    // Check for save button
    if (this.isSaveButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isSaving(target)) {
        setTimeout(() => this.captureInteraction('save', postElement), 100);
      }
    }
  }

  /**
   * Get post container selectors (required by base class)
   * @returns {Array<string>}
   */
  getPostContainerSelectors() {
    return InstagramSelectors.POST_CONTAINER;
  }

  /**
   * Check if element is a retweet button (Instagram doesn't have retweets)
   * @param {HTMLElement} element - Element to check
   * @returns {boolean}
   */
  isRetweetButton(element) {
    return false; // Instagram doesn't have retweets
  }

  /**
   * Check if element is a like button
   * @param {HTMLElement} element - Element to check
   * @returns {boolean}
   */
  isLikeButton(element) {
    // Check the element and its parents
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Like') || ariaLabel.includes('Unlike'))) {
        return true;
      }

      // Check for SVG with like icon
      if (el.tagName === 'svg') {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel && (ariaLabel.includes('Like') || ariaLabel.includes('Unlike'))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if element is a save button
   * @param {HTMLElement} element - Element to check
   * @returns {boolean}
   */
  isSaveButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Save') || ariaLabel.includes('Remove'))) {
        return true;
      }

      if (el.tagName === 'svg') {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel && (ariaLabel.includes('Save') || ariaLabel.includes('Remove'))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if the button click is a "liking" action (not unliking)
   * @param {HTMLElement} element - Button element
   * @returns {boolean}
   */
  isLiking(element) {
    // Look for aria-label "Like" (not "Unlike")
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) {
        return ariaLabel.includes('Like') && !ariaLabel.includes('Unlike');
      }

      if (el.tagName === 'svg') {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
          return ariaLabel.includes('Like') && !ariaLabel.includes('Unlike');
        }
      }
    }

    return true; // Default to true
  }

  /**
   * Check if the button click is a "saving" action (not removing)
   * @param {HTMLElement} element - Button element
   * @returns {boolean}
   */
  isSaving(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) {
        return ariaLabel.includes('Save') && !ariaLabel.includes('Remove');
      }

      if (el.tagName === 'svg') {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
          return ariaLabel.includes('Save') && !ariaLabel.includes('Remove');
        }
      }
    }

    return true; // Default to true
  }

  /**
   * Find the post element containing the button
   * @param {HTMLElement} button - Button element
   * @returns {HTMLElement|null}
   */
  findPostElement(button) {
    return button.closest('article') || button.closest('div[role="dialog"] article');
  }

  /**
   * Find all posts on the page
   * @returns {Array<HTMLElement>}
   */
  findAllPosts() {
    const posts = [];
    for (const selector of InstagramSelectors.POST_CONTAINER) {
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
   * @param {HTMLElement} element - Element to search
   * @returns {Array<HTMLElement>}
   */
  findPostsInElement(element) {
    const posts = [];
    for (const selector of InstagramSelectors.POST_CONTAINER) {
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
   * @param {HTMLElement} element - Element to check
   * @returns {boolean}
   */
  isPostElement(element) {
    return element.tagName === 'ARTICLE' ||
           (element.tagName === 'DIV' && element.getAttribute('role') === 'dialog');
  }

  /**
   * Extract post URL
   * @param {HTMLElement} postElement - Post element
   * @returns {string}
   */
  extractPostUrl(postElement) {
    const link = ContentExtractor.findWithFallback(postElement, InstagramSelectors.POST_LINK);
    return link ? link.href : window.location.href;
  }

  /**
   * Extract content from post
   * @param {HTMLElement} postElement - Post element
   * @returns {Object}
   */
  extractContent(postElement) {
    // Extract text
    const textElement = ContentExtractor.findWithFallback(postElement, InstagramSelectors.POST_TEXT);
    const text = textElement ? ContentExtractor.extractText(textElement) : '';

    // Extract images
    const imageUrls = ContentExtractor.extractImageUrls(
      postElement,
      InstagramSelectors.POST_IMAGES.join(',')
    );

    // Extract video
    const videoElement = ContentExtractor.findWithFallback(postElement, InstagramSelectors.POST_VIDEO);
    const videoUrl = videoElement ? (videoElement.src || videoElement.currentSrc) : null;

    // Extract URL
    const url = this.extractPostUrl(postElement);

    // Extract hashtags
    const hashtags = ContentExtractor.extractHashtags(text);

    return {
      text: ContentExtractor.cleanText(text),
      imageUrls: imageUrls,
      videoUrl: videoUrl,
      url: url,
      hashtags: hashtags
    };
  }

  /**
   * Extract metadata from post
   * @param {HTMLElement} postElement - Post element
   * @returns {Object}
   */
  extractMetadata(postElement) {
    // Extract author
    const authorElement = ContentExtractor.findWithFallback(postElement, InstagramSelectors.AUTHOR);
    const authorNameElement = ContentExtractor.findWithFallback(postElement, InstagramSelectors.AUTHOR_NAME);

    const author = authorNameElement ?
      ContentExtractor.extractText(authorNameElement) :
      (authorElement ? ContentExtractor.extractText(authorElement) : 'Unknown');

    const authorUrl = authorElement ? authorElement.href : '';

    // Extract date
    const dateElement = ContentExtractor.findWithFallback(postElement, InstagramSelectors.DATE);
    const date = dateElement ? ContentExtractor.extractDate(dateElement) : new Date().toISOString();

    // Extract likes
    const likesElement = ContentExtractor.findWithFallback(postElement, InstagramSelectors.LIKES);
    const likesText = likesElement ? ContentExtractor.extractText(likesElement) : '0';
    const likes = ContentExtractor.parseEngagementCount(likesText);

    // Extract comments
    const commentsElement = ContentExtractor.findWithFallback(postElement, InstagramSelectors.COMMENTS);
    const commentsText = commentsElement ? ContentExtractor.extractText(commentsElement) : '0';
    const comments = ContentExtractor.parseEngagementCount(commentsText);

    return {
      author: author,
      authorUrl: authorUrl,
      date: date,
      likes: likes,
      comments: comments,
      shares: 0 // Instagram doesn't show share count publicly
    };
  }
}

// Initialize tracker when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new InstagramTracker();
  });
} else {
  new InstagramTracker();
}

console.log('Instagram tracker script loaded');
