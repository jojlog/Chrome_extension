// Threads Tracker - Tracks interactions on Threads

// Defensive checks for required dependencies
if (!window.BasePlatformTracker) {
  throw new Error('ThreadsTracker: BasePlatformTracker not loaded. Check script order in manifest.json');
}
if (!window.ContentExtractor) {
  throw new Error('ThreadsTracker: ContentExtractor not loaded. Check script order in manifest.json');
}
if (!window.ThreadsSelectors) {
  throw new Error('ThreadsTracker: ThreadsSelectors not loaded. Check script order in manifest.json');
}

class ThreadsTracker extends BasePlatformTracker {
  constructor() {
    super('threads');
  }

  async init() {
    await super.init();
    this.scanExistingPosts();
    console.log(`${this.platform} tracker initialized`);
  }

  /**
   * Setup event listeners for Threads interactions
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      this.handleClick(e);
    }, true);

    console.log('Threads event listeners set up');
  }

  /**
   * Handle click events
   * @param {Event} e
   */
  handleClick(e) {
    const target = e.target;

    if (this.isLikeButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isLiking(target)) {
        setTimeout(() => this.captureInteraction('like', postElement), 100);
      }
    }

    if (this.isSaveButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isSaving(target)) {
        setTimeout(() => this.captureInteraction('save', postElement), 100);
      }
    }

    if (this.isRepostButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement) {
        setTimeout(() => {
          if (this.wasReposted(target)) {
            this.captureInteraction('repost', postElement);
          }
        }, 400);
      }
    }

    if (this.isQuoteButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement) {
        setTimeout(() => this.captureInteraction('quote', postElement), 300);
      }
    }
  }

  getPostContainerSelectors() {
    return ThreadsSelectors.POST_CONTAINER;
  }

  isLikeButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'like' || testId === 'unlike') {
        return true;
      }
      const ariaLabel = el.getAttribute('aria-label') || '';
      if (ariaLabel.includes('Like') || ariaLabel.includes('Unlike') || ariaLabel.includes('Liked')) {
        return true;
      }
    }
    return false;
  }

  isSaveButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'save' || testId === 'unsave') {
        return true;
      }
      const ariaLabel = el.getAttribute('aria-label') || '';
      if (ariaLabel.includes('Save') || ariaLabel.includes('Saved') || ariaLabel.includes('Unsave')) {
        return true;
      }
    }
    return false;
  }

  isRepostButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'repost' || testId === 'unrepost') {
        return true;
      }
      const ariaLabel = el.getAttribute('aria-label') || '';
      if (ariaLabel.includes('Repost') || ariaLabel.includes('Reposted') || ariaLabel.includes('Undo repost')) {
        return true;
      }
    }
    return false;
  }

  isRetweetButton(element) {
    return this.isRepostButton(element);
  }

  isQuoteButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'quote') {
        return true;
      }
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('quote')) {
        return true;
      }
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'quote' || text === 'quote post') {
        return true;
      }
    }
    return false;
  }

  isLiking(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('unlike') || ariaLabel.includes('remove like') || ariaLabel.includes('liked')) {
        return false;
      }
    }
    return true;
  }

  isSaving(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('unsave') || ariaLabel.includes('remove') || ariaLabel.includes('saved')) {
        return false;
      }
    }
    return true;
  }

  wasReposted(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const testId = el.getAttribute('data-testid');
      if (testId === 'unrepost') return true;
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('reposted') || ariaLabel.includes('undo repost')) {
        return true;
      }
    }
    return false;
  }

  extractPostUrl(postElement) {
    const link = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.POST_LINK);
    if (link && link.href) {
      return link.href;
    }
    return window.location.href;
  }

  extractContent(postElement) {
    let textElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.POST_TEXT);
    let text = textElement ? ContentExtractor.extractText(textElement) : '';

    if (!text) {
      const candidates = postElement.querySelectorAll('div[dir="auto"], span[dir="auto"], div[lang], span[lang]');
      const ignoreSelector = [
        'button',
        '[role="button"]',
        '[role="tab"]',
        '[role="menu"]',
        '[role="menuitem"]',
        'nav',
        'time',
        '[aria-label*="Like"]',
        '[aria-label*="Reply"]',
        '[aria-label*="Repost"]',
        '[aria-label*="Quote"]',
        '[aria-label*="Save"]',
        '[data-testid*="like"]',
        '[data-testid*="reply"]',
        '[data-testid*="repost"]',
        '[data-testid*="quote"]',
        '[data-testid*="save"]'
      ].join(',');

      const parts = [];
      candidates.forEach(node => {
        if (!node || node.closest(ignoreSelector)) return;
        const value = ContentExtractor.extractText(node);
        if (!value) return;
        if (value.length < 2) return;
        if (parts.includes(value)) return;
        parts.push(value);
      });

      text = parts.join(' ').trim();
    }

    const imageUrls = ContentExtractor.extractImageUrls(
      postElement,
      ThreadsSelectors.POST_IMAGES.join(','),
      (img) => {
        const alt = (img.getAttribute('alt') || '').toLowerCase();
        if (alt.includes('profile') || alt.includes('avatar')) return false;

        const width = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0', 10);
        const height = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '0', 10);
        if (width && height && Math.max(width, height) <= 64) return false;

        const src = img.currentSrc || img.src || img.dataset?.src || '';
        if (src && (src.includes('profile') || src.includes('avatar'))) return false;
        return true;
      }
    );

    const videoElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.POST_VIDEO);
    const videoUrl = videoElement ? (videoElement.src || videoElement.currentSrc) : null;

    const url = this.extractPostUrl(postElement);
    const hashtags = ContentExtractor.extractHashtags(text);

    return {
      text: ContentExtractor.cleanText(text),
      imageUrls: imageUrls,
      videoUrl: videoUrl,
      url: url,
      hashtags: hashtags
    };
  }

  extractMetadata(postElement) {
    const authorLinkElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.AUTHOR);
    const authorNameElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.AUTHOR_NAME);

    let author = 'Unknown';
    if (authorNameElement) {
      author = ContentExtractor.extractText(authorNameElement) || author;
    } else if (authorLinkElement) {
      author = ContentExtractor.extractText(authorLinkElement) || author;
    }

    const authorUrl = authorLinkElement ? authorLinkElement.href || '' : '';

    const dateElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.DATE);
    const date = dateElement ? ContentExtractor.extractDate(dateElement) : new Date().toISOString();

    const likesElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.LIKES);
    const likes = likesElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(likesElement)) : 0;

    const repliesElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.REPLIES);
    const replies = repliesElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(repliesElement)) : 0;

    const repostsElement = ContentExtractor.findWithFallback(postElement, ThreadsSelectors.REPOSTS);
    const reposts = repostsElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(repostsElement)) : 0;

    return {
      author: author,
      authorUrl: authorUrl,
      date: date,
      likes: likes,
      comments: replies,
      shares: reposts
    };
  }

  /**
   * Extract the currently logged-in user on Threads
   * @returns {Object|null} User info
   */
  extractLoggedInUser() {
    try {
      const direct = document.querySelector('a[href^="/@"][aria-label*="Profile"], a[href^="/@"][aria-label*="Account"], a[href^="/@"][aria-label*="Me"]');
      const candidate = direct || Array.from(document.querySelectorAll('a[href^="/@"]'))
        .find(a => !a.closest('article') && !a.closest('[role="article"]') && (a.closest('header') || a.closest('nav') || (a.getAttribute('aria-label') || '').toLowerCase().includes('profile')));

      if (!candidate) return null;

      const href = candidate.getAttribute('href') || '';
      const match = href.match(/\/@([^/?#]+)/);
      if (!match) return null;

      const username = match[1];
      let fullName = candidate.getAttribute('title') || ContentExtractor.extractText(candidate) || null;
      if (fullName && fullName.replace(/^@/, '') === username) {
        fullName = null;
      }

      return { username, fullName, id: null };
    } catch (error) {
      console.error('Error extracting logged-in user:', error);
      return null;
    }
  }

  detectPageMode() {
    let pathname = '';
    let search = '';
    let hash = '';

    try {
      const url = new URL(window.location.href);
      pathname = url.pathname.toLowerCase();
      search = url.search.toLowerCase();
      hash = url.hash.toLowerCase();
    } catch (error) {
      pathname = (window.location.pathname || '').toLowerCase();
      search = (window.location.search || '').toLowerCase();
      hash = (window.location.hash || '').toLowerCase();
    }

    const tabParamMatch = search.match(/[?&]tab=([^&]+)/);
    const tabParam = tabParamMatch ? tabParamMatch[1] : '';

    const looksLike = (value, parts) => parts.some(part => value.includes(part));

    if (looksLike(pathname, ['/likes', '/liked']) || looksLike(search, ['likes']) || looksLike(hash, ['likes']) || looksLike(tabParam, ['like'])) {
      return 'likes';
    }

    if (looksLike(pathname, ['/saved', '/bookmarks']) || looksLike(search, ['saved', 'bookmark']) || looksLike(hash, ['saved', 'bookmark']) || looksLike(tabParam, ['saved', 'bookmark'])) {
      return 'saved';
    }

    if (looksLike(pathname, ['/reposts', '/repost']) || looksLike(search, ['repost']) || looksLike(hash, ['repost']) || looksLike(tabParam, ['repost'])) {
      return 'reposts';
    }

    const activeTab = this.detectActiveProfileTab();
    if (activeTab === 'likes' || activeTab === 'saved' || activeTab === 'reposts') {
      return activeTab;
    }

    return null;
  }

  detectActiveProfileTab() {
    const candidates = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"], [data-selected="true"], [aria-current="page"]'));
    for (const el of candidates) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (!text) continue;
      if (text.includes('like')) return 'likes';
      if (text.includes('saved') || text.includes('bookmark')) return 'saved';
      if (text.includes('repost')) return 'reposts';
    }

    const tabCandidates = ContentExtractor.findAllWithFallback(document, ThreadsSelectors.PROFILE_TABS) || [];
    for (const el of tabCandidates) {
      const isActive = el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-current') === 'page' || el.classList.contains('active');
      if (!isActive) continue;
      const text = (el.textContent || '').trim().toLowerCase();
      if (text.includes('like')) return 'likes';
      if (text.includes('saved') || text.includes('bookmark')) return 'saved';
      if (text.includes('repost')) return 'reposts';
    }

    return null;
  }

  getInteractionTypeForPageMode() {
    if (this.pageMode === 'reposts') return 'imported_repost';
    return super.getInteractionTypeForPageMode();
  }

  getScrollContainerOverride() {
    const candidates = [
      'main',
      '[role="main"]',
      '[role="feed"]'
    ];

    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ThreadsTracker();
  });
} else {
  new ThreadsTracker();
}

console.log('Threads tracker script loaded');
