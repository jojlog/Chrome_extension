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
    let pathname = '';
    let href = '';
    try {
      const url = new URL(window.location.href);
      pathname = url.pathname || '';
      href = url.href || '';
    } catch (error) {
      pathname = window.location.pathname || '';
      href = window.location.href || '';
    }

    const normalizedPath = pathname.replace(/\/+$/, '');

    const normalizedHref = href.replace(/\/+$/, '');

    // Twitter bookmarks: x.com/i/bookmarks or x.com/bookmarks (new routing)
    if (normalizedPath === '/i/bookmarks' ||
      normalizedPath.startsWith('/i/bookmarks/') ||
      normalizedPath === '/bookmarks' ||
      normalizedPath.startsWith('/bookmarks/')) {
      return 'bookmarks';
    }
    if (normalizedHref.includes('/i/bookmarks') || normalizedHref.includes('/bookmarks')) {
      return 'bookmarks';
    }

    // Twitter likes: x.com/{username}/likes or x.com/i/likes
    if (normalizedPath.match(/^\/[^/]+\/likes(?:\/|$)/) ||
      normalizedPath === '/i/likes' ||
      normalizedPath.startsWith('/i/likes/')) {
      return 'likes';
    }
    if (normalizedHref.includes('/i/likes')) {
      return 'likes';
    }

    return null;
  }

  getScrollContainerOverride() {
    const candidates = [
      'section[aria-label*="Timeline"]',
      '[aria-label*="Timeline"]',
      '[aria-label*="Bookmarks"]',
      '[aria-label*="Likes"]',
      '[data-testid="primaryColumn"]',
      'main[role="main"]',
      '[role="main"]'
    ];

    const isScrollableByTest = (node) => {
      if (!node || !(node instanceof Element)) return false;
      const clientHeight = node.clientHeight || 0;
      const scrollHeight = node.scrollHeight || 0;
      if (clientHeight < 200 || scrollHeight - clientHeight <= 10) return false;
      const before = node.scrollTop;
      node.scrollTop = before + 1;
      const changed = node.scrollTop !== before;
      if (changed) {
        node.scrollTop = before;
      }
      return changed;
    };

    const isLikelyScrollable = (node) => {
      if (!node || !(node instanceof Element)) return false;
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY || '';
      const clientHeight = node.clientHeight || 0;
      return clientHeight >= 200 && (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
    };

    const findScrollableAncestor = (el, allowLikely = false) => {
      for (let node = el; node && node !== document.body; node = node.parentElement) {
        if (isScrollableByTest(node) || (allowLikely && isLikelyScrollable(node))) return node;
      }
      return null;
    };

    const findScrollableDescendant = (root, allowLikely = false) => {
      if (!root) return null;
      const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
      let best = null;
      let bestScore = -1;
      nodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (!isScrollableByTest(node) && !(allowLikely && isLikelyScrollable(node))) return;
        const score = (node.scrollHeight || 0) - (node.clientHeight || 0);
        if (score > bestScore) {
          best = node;
          bestScore = score;
        }
      });
      return best;
    };

    const posts = this.findAllPosts();
    if (posts.length) {
      const referencePost = posts[0];
      for (let node = referencePost.parentElement; node && node !== document.body; node = node.parentElement) {
        const clientHeight = node.clientHeight || 0;
        const scrollHeight = node.scrollHeight || 0;
        if (clientHeight < 200 || scrollHeight - clientHeight <= 10) continue;
        const beforeTop = node.scrollTop || 0;
        const beforeRect = referencePost.getBoundingClientRect();
        node.scrollTop = beforeTop + 1;
        const afterRect = referencePost.getBoundingClientRect();
        node.scrollTop = beforeTop;
        if (Math.abs(afterRect.top - beforeRect.top) > 0.5) {
          return node;
        }
      }

      const scroller = this.findScrollContainerForPosts(posts) ||
        findScrollableAncestor(referencePost, true);
      if (scroller) return scroller;

      const beforeRect = referencePost.getBoundingClientRect();
      window.scrollBy(0, 1);
      const afterRect = referencePost.getBoundingClientRect();
      window.scrollBy(0, -1);
      if (Math.abs(afterRect.top - beforeRect.top) > 0.5) {
        return document.scrollingElement || document.documentElement || document.body;
      }
    }

    const timeline = document.querySelector('[aria-label*="Timeline"]') ||
      document.querySelector('section[aria-label*="Timeline"]');
    if (timeline) {
      const scroller = findScrollableAncestor(timeline, true) ||
        findScrollableDescendant(timeline, true);
      if (scroller) return scroller;
    }

    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (primaryColumn) {
      const scroller = findScrollableDescendant(primaryColumn, true);
      if (scroller) return scroller;
    }

    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const scroller = findScrollableAncestor(el, true);
      if (scroller) return scroller;
    }

    return null;
  }

  scrollByAmount(container, amount) {
    const isDocContainer = (node) => (
      node === document.scrollingElement ||
      node === document.documentElement ||
      node === document.body
    );
    const isScrollableByTest = (node) => {
      if (!node || !(node instanceof Element)) return false;
      const clientHeight = node.clientHeight || 0;
      const scrollHeight = node.scrollHeight || 0;
      if (clientHeight < 200 || scrollHeight - clientHeight <= 10) return false;
      const before = node.scrollTop;
      node.scrollTop = before + 1;
      const changed = node.scrollTop !== before;
      if (changed) {
        node.scrollTop = before;
      }
      return changed;
    };
    const isLikelyScrollable = (node) => {
      if (!node || !(node instanceof Element)) return false;
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY || '';
      const clientHeight = node.clientHeight || 0;
      return clientHeight >= 200 && (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
    };
    const findScrollableAncestor = (el, allowLikely = false) => {
      for (let node = el; node && node !== document.body; node = node.parentElement) {
        if (isScrollableByTest(node) || (allowLikely && isLikelyScrollable(node))) return node;
      }
      return null;
    };

    const posts = this.findAllPosts();
    const lastPost = posts.length ? posts[posts.length - 1] : null;
    const referencePost = posts.length ? posts[0] : null;
    const beforeRect = referencePost ? referencePost.getBoundingClientRect() : null;

    let target = container;
    const preferredScroller = posts.length
      ? this.findScrollContainerForPosts(posts) || findScrollableAncestor(posts[0], true)
      : null;
    if (preferredScroller) {
      target = preferredScroller;
    } else if (isDocContainer(container)) {
      const scroller = lastPost ? findScrollableAncestor(lastPost, true) : null;
      if (scroller) {
        target = scroller;
      }
    }

    super.scrollByAmount(target, amount);
    let afterRect = referencePost ? referencePost.getBoundingClientRect() : null;
    let moved = beforeRect && afterRect && Math.abs(afterRect.top - beforeRect.top) > 2;
    if (moved) return;

    const docScroller = document.scrollingElement || document.documentElement || document.body;
    if (docScroller) {
      const beforeDoc = docScroller.scrollTop || 0;
      docScroller.scrollTop = beforeDoc + amount;
    }

    afterRect = referencePost ? referencePost.getBoundingClientRect() : null;
    moved = beforeRect && afterRect && Math.abs(afterRect.top - beforeRect.top) > 2;
    if (moved) return;

    if (lastPost && typeof lastPost.scrollIntoView === 'function') {
      console.log('twitter: Fallback scrollIntoView for auto-scroll');
      lastPost.scrollIntoView({ block: 'end' });
      afterRect = referencePost ? referencePost.getBoundingClientRect() : null;
      moved = beforeRect && afterRect && Math.abs(afterRect.top - beforeRect.top) > 2;
      if (moved) return;
    }

    const main = document.querySelector('[data-testid="primaryColumn"]') ||
      document.querySelector('main[role="main"]') ||
      document.querySelector('[role="main"]');
    if (main && typeof main.scrollBy === 'function') {
      main.scrollBy(0, amount);
    }
  }

  getDocumentScrollTop() {
    return window.scrollY ||
      document.documentElement?.scrollTop ||
      document.body?.scrollTop ||
      0;
  }

  getDocumentScrollHeight() {
    return Math.max(
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0
    );
  }

  getContainerScrollTop(container) {
    if (!container || container === document.scrollingElement ||
      container === document.documentElement || container === document.body) {
      return this.getDocumentScrollTop();
    }
    return container.scrollTop || 0;
  }

  getContainerScrollHeight(container) {
    if (!container || container === document.scrollingElement ||
      container === document.documentElement || container === document.body) {
      return this.getDocumentScrollHeight();
    }
    return container.scrollHeight || 0;
  }

  scrollContainerBy(container, amount) {
    if (!container || container === document.scrollingElement ||
      container === document.documentElement || container === document.body) {
      window.scrollBy(0, amount);
      return;
    }
    if (typeof container.scrollBy === 'function') {
      container.scrollBy(0, amount);
      return;
    }
    container.scrollTop = (container.scrollTop || 0) + amount;
  }

  findScrollContainerForPosts(posts) {
    if (!posts || posts.length === 0) return null;
    const candidates = new Map();
    const isScrollable = (node) => {
      if (!node || !(node instanceof Element)) return false;
      if (node === document.body || node === document.documentElement || node === document.scrollingElement) {
        return false;
      }
      const clientHeight = node.clientHeight || 0;
      const scrollHeight = node.scrollHeight || 0;
      if (clientHeight < 200) return false;
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY || '';
      const hasScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
      if (!hasScroll) return false;
      const before = node.scrollTop;
      node.scrollTop = before + 1;
      const changed = node.scrollTop !== before;
      if (changed) node.scrollTop = before;
      if (changed) return true;
      return (scrollHeight - clientHeight) > 10;
    };

    posts.forEach((post) => {
      for (let node = post.parentElement; node && node !== document.body; node = node.parentElement) {
        if (!isScrollable(node)) continue;
        const entry = candidates.get(node) || { score: 0, height: node.scrollHeight || 0 };
        entry.score += 1;
        entry.height = Math.max(entry.height, node.scrollHeight || 0);
        candidates.set(node, entry);
      }
    });

    let best = null;
    let bestScore = -1;
    let bestHeight = -1;
    candidates.forEach((meta, node) => {
      if (meta.score > bestScore || (meta.score === bestScore && meta.height > bestHeight)) {
        best = node;
        bestScore = meta.score;
        bestHeight = meta.height;
      }
    });

    return best;
  }

  async runAutoScrollLoop() {
    this.autoScrollState.dailyCount = await this.getDailyAutoScrollCount();

    while (this.autoScrollState.running) {
      if (this.autoScrollState.paused) {
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      const elapsed = Date.now() - this.autoScrollState.startTime;
      if (this.autoScrollState.importedCount >= this.autoScrollState.maxItems) {
        this.stopAutoScrollImport('completed');
        break;
      }
      if (elapsed >= this.autoScrollState.maxDurationMs) {
        this.stopAutoScrollImport('completed');
        break;
      }
      if (this.autoScrollState.dailyCount >= this.autoScrollState.dailyLimit) {
        this.updateAutoScrollOverlay('Completed', 'Daily limit reached.', true);
        this.stopAutoScrollImport('completed');
        break;
      }

      const posts = this.findAllPosts();
      const scrollContainer = this.findScrollContainerForPosts(posts) ||
        document.scrollingElement || document.documentElement || document.body;
      const beforeHeight = this.getContainerScrollHeight(scrollContainer);
      const beforeTop = this.getContainerScrollTop(scrollContainer);
      const stepRatio = this.randomBetween(0.45, 0.85);
      const stepSize = Math.max(200, Math.floor(window.innerHeight * stepRatio));

      this.scrollContainerBy(scrollContainer, stepSize);

      const lastPost = posts.length ? posts[posts.length - 1] : null;
      const afterTopAttempt = this.getContainerScrollTop(scrollContainer);
      if (afterTopAttempt === beforeTop && lastPost && typeof lastPost.scrollIntoView === 'function') {
        lastPost.scrollIntoView({ block: 'end' });
      }

      const stepDelay = this.randomBetween(800, 2500);
      await new Promise(resolve => setTimeout(resolve, stepDelay));

      const captured = await this.bulkCaptureVisiblePosts({
        force: true,
        suppressSummary: true
      });
      if (captured > 0) {
        this.autoScrollState.importedCount += captured;
        this.autoScrollState.dailyCount += captured;
        await this.incrementDailyAutoScrollCount(captured);
      }

      const afterHeight = this.getContainerScrollHeight(scrollContainer);
      const afterTop = this.getContainerScrollTop(scrollContainer);
      if (afterHeight <= beforeHeight + 10 && afterTop <= beforeTop + 5) {
        this.autoScrollState.noGrowthStreak += 1;
      } else {
        this.autoScrollState.noGrowthStreak = 0;
      }

      this.updateAutoScrollOverlay(
        this.autoScrollState.paused ? 'Paused' : 'Running',
        `Imported ${this.autoScrollState.importedCount} items`
      );

      this.autoScrollState.stepCount += 1;
      if (this.shouldMicroPause()) {
        this.updateAutoScrollOverlay('Running', 'Taking a short break...');
        await new Promise(resolve => setTimeout(resolve, this.randomBetween(3000, 8000)));
      }

      if (this.autoScrollState.noGrowthStreak >= this.autoScrollState.minNoGrowthChecks) {
        this.stopAutoScrollImport('completed');
        break;
      }
    }
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
