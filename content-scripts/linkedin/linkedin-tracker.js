// LinkedIn Tracker - Tracks interactions on LinkedIn

// Defensive checks for required dependencies
if (!window.BasePlatformTracker) {
  throw new Error('LinkedInTracker: BasePlatformTracker not loaded. Check script order in manifest.json');
}
if (!window.ContentExtractor) {
  throw new Error('LinkedInTracker: ContentExtractor not loaded. Check script order in manifest.json');
}
if (!window.LinkedInSelectors) {
  throw new Error('LinkedInTracker: LinkedInSelectors not loaded. Check script order in manifest.json');
}

// NOTE: Classes are already declared in their source files which run before this file.

class LinkedInTracker extends BasePlatformTracker {
  constructor() {
    super('linkedin');
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      this.handleClick(e);
    }, true);

    console.log('LinkedIn event listeners set up');
  }

  handleClick(e) {
    const target = e.target;

    if (this.isLikeButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isLiking(target)) {
        setTimeout(() => this.handleInteraction('like', postElement), 100);
      }
    }

    if (this.isSaveButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isSaving(target)) {
        setTimeout(() => this.handleInteraction('save', postElement), 100);
      }
    }
  }

  isLikeButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Like') || ariaLabel.includes('React'))) {
        return true;
      }
    }
    return false;
  }

  isSaveButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Save') || ariaLabel.includes('Unsave'))) {
        return true;
      }
    }
    return false;
  }

  isLiking(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && !ariaLabel.includes('Unlike')) {
        return true;
      }
    }
    return true;
  }

  isSaving(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.includes('Unsave')) {
        return false;
      }
    }
    return true;
  }

  findPostElement(button) {
    return button.closest('.feed-shared-update-v2') ||
      button.closest('[data-id*="urn:li:activity"]');
  }

  findAllPosts() {
    return Array.from(document.querySelectorAll('.feed-shared-update-v2'));
  }

  findPostsInElement(element) {
    return Array.from(element.querySelectorAll('.feed-shared-update-v2'));
  }

  isPostElement(element) {
    return element.classList.contains('feed-shared-update-v2');
  }

  extractPostUrl(postElement) {
    const link = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.POST_LINK);
    return link ? link.href : window.location.href;
  }

  extractContent(postElement) {
    const textElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.POST_TEXT);
    const text = textElement ? ContentExtractor.extractText(textElement) : '';

    const imageUrls = ContentExtractor.extractImageUrls(
      postElement,
      LinkedInSelectors.POST_IMAGES.join(',')
    );

    const videoElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.POST_VIDEO);
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
    const authorElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.AUTHOR);
    const authorLinkElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.AUTHOR_LINK);

    const author = authorElement ? ContentExtractor.extractText(authorElement) : 'Unknown';
    const authorUrl = authorLinkElement ? authorLinkElement.href : '';

    const dateElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.DATE);
    const date = dateElement ? ContentExtractor.extractDate(dateElement) : new Date().toISOString();

    const likesElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.LIKES);
    const likes = likesElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(likesElement)) : 0;

    const commentsElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.COMMENTS);
    const comments = commentsElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(commentsElement)) : 0;

    const sharesElement = ContentExtractor.findWithFallback(postElement, LinkedInSelectors.SHARES);
    const shares = sharesElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(sharesElement)) : 0;

    return {
      author: author,
      authorUrl: authorUrl,
      date: date,
      likes: likes,
      comments: comments,
      shares: shares
    };
  }

  /**
   * Extract the currently logged-in user on LinkedIn
   * @returns {Object|null} User info
   */
  extractLoggedInUser() {
    try {
      // Try feed identity module (sidebar with your profile)
      const feedIdentity = document.querySelector('.feed-identity-module');
      if (feedIdentity) {
        const nameElement = feedIdentity.querySelector('.feed-identity-module__actor-meta');
        const linkElement = feedIdentity.querySelector('a[href*="/in/"]');

        if (linkElement) {
          const href = linkElement.getAttribute('href');
          const usernameMatch = href?.match(/\/in\/([^\/\?]+)/);
          const username = usernameMatch ? usernameMatch[1] : null;
          const fullName = nameElement?.textContent?.trim();

          if (username) {
            return { username, fullName: fullName || null, id: null };
          }
        }
      }

      // Fallback: Try global nav profile link
      const navProfile = document.querySelector('.global-nav__me-photo, .global-nav__primary-link-me');
      if (navProfile) {
        const link = navProfile.closest('a') || navProfile.querySelector('a');
        if (link) {
          const href = link.getAttribute('href');
          const usernameMatch = href?.match(/\/in\/([^\/\?]+)/);
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LinkedInTracker();
  });
} else {
  new LinkedInTracker();
}

console.log('LinkedIn tracker script loaded');
