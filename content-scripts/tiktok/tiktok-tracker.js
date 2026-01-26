// TikTok Tracker - Tracks interactions on TikTok

// Defensive checks for required dependencies
if (!window.BasePlatformTracker) {
  throw new Error('TikTokTracker: BasePlatformTracker not loaded. Check script order in manifest.json');
}
if (!window.ContentExtractor) {
  throw new Error('TikTokTracker: ContentExtractor not loaded. Check script order in manifest.json');
}
if (!window.TikTokSelectors) {
  throw new Error('TikTokTracker: TikTokSelectors not loaded. Check script order in manifest.json');
}

// NOTE: Classes are already declared in their source files which run before this file.

class TikTokTracker extends BasePlatformTracker {
  constructor() {
    super('tiktok');
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      this.handleClick(e);
    }, true);

    console.log('TikTok event listeners set up');
  }

  handleClick(e) {
    const target = e.target;

    if (this.isLikeButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isLiking(target)) {
        setTimeout(() => this.captureInteraction('like', postElement), 100);
      }
    }

    if (this.isFavoriteButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isFavoriting(target)) {
        setTimeout(() => this.captureInteraction('save', postElement), 100);
      }
    }
  }

  getPostContainerSelectors() {
    if (this.pageMode && this.pageMode !== 'feed' && TikTokSelectors.PROFILE_GRID_ITEM) {
      return [...TikTokSelectors.PROFILE_GRID_ITEM, ...TikTokSelectors.POST_CONTAINER];
    }
    return TikTokSelectors.POST_CONTAINER;
  }

  isLikeButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const dataE2e = el.getAttribute('data-e2e');
      if (dataE2e && dataE2e.includes('like-icon')) {
        return true;
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.toLowerCase().includes('like')) {
        return true;
      }
    }
    return false;
  }

  isFavoriteButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const dataE2e = el.getAttribute('data-e2e');
      if (dataE2e && dataE2e.includes('save-button')) {
        return true;
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Favorite') || ariaLabel.includes('favorites'))) {
        return true;
      }
    }
    return false;
  }

  isLiking(element) {
    // TikTok doesn't clearly indicate unlike, so we assume it's liking
    return true;
  }

  isFavoriting(element) {
    // Assume favoriting action
    return true;
  }

  findPostElement(button) {
    return button.closest('div[data-e2e="recommend-list-item-container"]') ||
      button.closest('div.DivItemContainerV2') ||
      button.closest('div[class*="DivItemContainer"]');
  }

  findAllPosts() {
    const posts = [];
    for (const selector of TikTokSelectors.POST_CONTAINER) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        posts.push(...Array.from(found));
        break;
      }
    }
    return posts;
  }

  findPostsInElement(element) {
    const posts = [];
    for (const selector of TikTokSelectors.POST_CONTAINER) {
      const found = element.querySelectorAll(selector);
      if (found.length > 0) {
        posts.push(...Array.from(found));
        break;
      }
    }
    return posts;
  }

  isPostElement(element) {
    return element.getAttribute('data-e2e') === 'recommend-list-item-container' ||
      element.classList.contains('DivItemContainerV2');
  }

  extractPostUrl(postElement) {
    const link = ContentExtractor.findWithFallback(postElement, TikTokSelectors.POST_LINK);
    return link ? link.href : window.location.href;
  }

  extractContent(postElement) {
    if (this.pageMode && this.pageMode !== 'feed') {
      const linkCandidate = postElement.tagName === 'A' ?
        postElement :
        ContentExtractor.findWithFallback(postElement, TikTokSelectors.PROFILE_GRID_LINK);
      const textCandidate = ContentExtractor.findWithFallback(postElement, TikTokSelectors.POST_TEXT);
      if (linkCandidate && !textCandidate) {
        return this.extractProfileGridContent(postElement);
      }
    }

    const textElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.POST_TEXT);
    const text = textElement ? ContentExtractor.extractText(textElement) : '';

    const videoElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.POST_VIDEO);
    const videoUrl = videoElement ? (videoElement.src || videoElement.currentSrc) : null;

    const url = this.extractPostUrl(postElement);
    const hashtags = ContentExtractor.extractHashtags(text);

    return {
      text: ContentExtractor.cleanText(text),
      imageUrls: [], // TikTok is primarily video
      videoUrl: videoUrl,
      url: url,
      hashtags: hashtags
    };
  }

  extractProfileGridContent(postElement) {
    const link = postElement.tagName === 'A' ?
      postElement :
      ContentExtractor.findWithFallback(postElement, TikTokSelectors.PROFILE_GRID_LINK);
    const url = link ? link.href : window.location.href;

    const imageUrls = ContentExtractor.extractImageUrls(
      postElement,
      TikTokSelectors.PROFILE_GRID_THUMB.join(',')
    );

    return {
      text: '',
      imageUrls: imageUrls,
      videoUrl: null,
      url: url,
      hashtags: []
    };
  }

  extractMetadata(postElement) {
    const authorElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.AUTHOR);
    const authorLinkElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.AUTHOR_LINK);

    const author = authorElement ? ContentExtractor.extractText(authorElement) : 'Unknown';
    const authorUrl = authorLinkElement ? authorLinkElement.href : '';

    const likesElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.LIKES);
    const likes = likesElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(likesElement)) : 0;

    const commentsElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.COMMENTS);
    const comments = commentsElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(commentsElement)) : 0;

    const sharesElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.SHARES);
    const shares = sharesElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(sharesElement)) : 0;

    return {
      author: author,
      authorUrl: authorUrl,
      date: new Date().toISOString(), // TikTok doesn't always show dates clearly
      likes: likes,
      comments: comments,
      shares: shares
    };
  }

  /**
   * Extract the currently logged-in user on TikTok
   * @returns {Object|null} User info
   */
  extractLoggedInUser() {
    try {
      // Try profile link in header
      const profileLink = document.querySelector('[data-e2e="profile-icon"]');
      if (profileLink) {
        const link = profileLink.closest('a') || profileLink;
        const href = link.getAttribute('href');
        if (href) {
          const usernameMatch = href.match(/\/@([^\/\?]+)/);
          if (usernameMatch) {
            return { username: usernameMatch[1], fullName: null, id: null };
          }
        }
      }

      // Fallback: Check avatar/profile in bottom nav or header
      const avatarLinks = document.querySelectorAll('a[href^="/@"]');
      for (const link of avatarLinks) {
        // Look for profile-like elements
        if (link.querySelector('img') || link.getAttribute('data-e2e')?.includes('profile')) {
          const href = link.getAttribute('href');
          const usernameMatch = href?.match(/\/@([^\/\?]+)/);
          if (usernameMatch) {
            return { username: usernameMatch[1], fullName: null, id: null };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting logged-in user:', error);
      return null;
    }
  }

  /**
   * Detect the current page mode for TikTok
   * @returns {string|null} 'favorites', 'likes', or null
   */
  detectPageMode() {
    const path = window.location.pathname;
    if (path.match(/^\/@[^\/]+\/favorites\/?$/)) {
      return 'favorites';
    }
    if (path.match(/^\/@[^\/]+\/liked\/?$/)) {
      return 'likes';
    }
    return null;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TikTokTracker();
  });
} else {
  new TikTokTracker();
}

console.log('TikTok tracker script loaded');
