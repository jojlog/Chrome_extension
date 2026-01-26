// TikTok Tracker - Tracks interactions on TikTok
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
        setTimeout(() => this.handleInteraction('like', postElement), 100);
      }
    }

    if (this.isFavoriteButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isFavoriting(target)) {
        setTimeout(() => this.handleInteraction('save', postElement), 100);
      }
    }
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TikTokTracker();
  });
} else {
  new TikTokTracker();
}

console.log('TikTok tracker script loaded');
