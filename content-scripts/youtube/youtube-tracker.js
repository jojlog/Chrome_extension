// YouTube Tracker - Tracks interactions on YouTube

// Defensive checks for required dependencies
if (!window.BasePlatformTracker) {
  throw new Error('YouTubeTracker: BasePlatformTracker not loaded. Check script order in manifest.json');
}
if (!window.ContentExtractor) {
  throw new Error('YouTubeTracker: ContentExtractor not loaded. Check script order in manifest.json');
}
if (!window.YouTubeSelectors) {
  throw new Error('YouTubeTracker: YouTubeSelectors not loaded. Check script order in manifest.json');
}

class YouTubeTracker extends BasePlatformTracker {
  constructor() {
    super('youtube');
  }

  async init() {
    await super.init();
    this.scanExistingPosts();
    console.log(`${this.platform} tracker initialized`);
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      this.handleClick(e);
    }, true);

    console.log('YouTube event listeners set up');
  }

  handleClick(e) {
    const target = e.target;

    if (this.isLikeButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && this.isLiking(target)) {
        setTimeout(() => this.captureInteraction('like', postElement), 150);
      }
    }

    if (this.isSaveButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement) {
        setTimeout(() => this.captureInteraction('save', postElement), 150);
      }
    }
  }

  getPostContainerSelectors() {
    return YouTubeSelectors.POST_CONTAINER;
  }

  findPostElement(element) {
    const selectors = this.getPostContainerSelectors();
    if (selectors && selectors.length > 0) {
      for (const selector of selectors) {
        const post = element.closest ? element.closest(selector) : null;
        if (post) return post;
      }
    }

    const watchRoot = document.querySelector('ytd-watch-flexy') || document.querySelector('#primary') || document.querySelector('ytd-watch-metadata');
    if (watchRoot) return watchRoot;

    return document.body;
  }

  isLikeButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('like') && !ariaLabel.includes('dislike')) {
        return true;
      }
      if (el.matches && el.matches(YouTubeSelectors.LIKE_BUTTON.join(','))) {
        return true;
      }
    }
    return false;
  }

  isSaveButton(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('save')) {
        return true;
      }
      if (el.matches && el.matches(YouTubeSelectors.SAVE_BUTTON.join(','))) {
        return true;
      }
    }
    return false;
  }

  isLiking(element) {
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      const pressed = el.getAttribute('aria-pressed');
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (pressed === 'true') return false;
      if (ariaLabel.includes('remove like') || ariaLabel.includes('liked')) return false;
    }
    return true;
  }

  extractPostUrl(postElement) {
    const link = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.POST_LINK);
    if (link && link.href) return link.href;

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical?.href) return canonical.href;

    return window.location.href;
  }

  extractContent(postElement) {
    const titleElement = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.POST_TITLE);
    const textElement = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.POST_TEXT);

    const title = titleElement ? ContentExtractor.extractText(titleElement) : '';
    const text = textElement ? ContentExtractor.extractText(textElement) : '';

    const imageUrls = ContentExtractor.extractImageUrls(
      postElement,
      YouTubeSelectors.POST_IMAGES.join(','),
      (img) => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        if (width && height && Math.max(width, height) < 64) return false;
        const src = img.currentSrc || img.src || '';
        if (src.includes('avatar') || src.includes('profile')) return false;
        return true;
      }
    );

    const videoElement = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.POST_VIDEO);
    const videoUrl = videoElement ? (videoElement.currentSrc || videoElement.src) : null;

    const url = this.extractPostUrl(postElement);
    if (!imageUrls || imageUrls.length === 0) {
      const metaImage = document.querySelector('meta[property="og:image"]')?.content
        || document.querySelector('meta[name="twitter:image"]')?.content
        || document.querySelector('link[rel="image_src"]')?.href
        || '';
      if (metaImage) {
        imageUrls.push(metaImage);
      }
    }

    if (!imageUrls || imageUrls.length === 0) {
      const videoId = this.extractVideoId(url);
      if (videoId) {
        imageUrls.push(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
      }
    }

    const combinedText = [title, text].filter(Boolean).join(' — ');
    const hashtags = ContentExtractor.extractHashtags(combinedText);

    return {
      text: ContentExtractor.cleanText(combinedText),
      imageUrls,
      videoUrl,
      url,
      hashtags
    };
  }

  extractVideoId(url) {
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname.includes('youtu.be')) {
        const shortId = parsed.pathname.replace('/', '').trim();
        return shortId || null;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const parts = parsed.pathname.split('/');
        return parts[2] || null;
      }
      const videoId = parsed.searchParams.get('v');
      return videoId || null;
    } catch (error) {
      return null;
    }
  }

  extractMetadata(postElement) {
    const authorElement = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.AUTHOR);
    const authorNameElement = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.AUTHOR_NAME);

    const author = authorNameElement
      ? ContentExtractor.extractText(authorNameElement)
      : (authorElement ? ContentExtractor.extractText(authorElement) : 'Unknown');

    const authorUrl = authorElement?.href || '';

    const dateElement = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.DATE);
    const date = dateElement ? ContentExtractor.extractDate(dateElement) : new Date().toISOString();

    const likesElement = ContentExtractor.findWithFallback(postElement, YouTubeSelectors.LIKES);
    const likes = likesElement ? ContentExtractor.parseEngagementCount(ContentExtractor.extractText(likesElement)) : 0;

    return {
      author,
      authorUrl,
      date,
      likes,
      comments: 0,
      shares: 0
    };
  }

  extractLoggedInUser() {
    try {
      const avatarButton = document.querySelector('button#avatar-btn');
      if (avatarButton) {
        const aria = avatarButton.getAttribute('aria-label') || '';
        if (aria) {
          const cleaned = aria.replace(/^Google Account:\s*/i, '').trim();
          if (cleaned) {
            return { username: cleaned, fullName: cleaned, id: null };
          }
        }
      }

      const avatar = document.querySelector('button#avatar-btn img, ytd-topbar-menu-button-renderer img');
      if (!avatar) return null;
      const alt = avatar.getAttribute('alt') || '';
      const title = avatar.getAttribute('title') || '';
      const label = avatar.getAttribute('aria-label') || '';

      const name = alt || title || label || null;
      if (!name) return null;

      return { username: name.replace(/\s*\(.*\)\s*$/, '').trim(), fullName: name.trim(), id: null };
    } catch (error) {
      console.error('Error extracting logged-in user:', error);
      return null;
    }
  }

  detectPageMode() {
    let pathname = '';
    let search = '';
    try {
      const url = new URL(window.location.href);
      pathname = url.pathname;
      search = url.search;
    } catch (error) {
      pathname = window.location.pathname || '';
      search = window.location.search || '';
    }

    const query = new URLSearchParams(search);
    const list = (query.get('list') || '').toUpperCase();

    if (pathname.startsWith('/playlist') && list.startsWith('WL')) {
      return 'watch_later';
    }

    if (pathname.startsWith('/playlist') && list.startsWith('LL')) {
      return 'likes';
    }

    if (pathname.startsWith('/feed/liked')) {
      return 'likes';
    }

    return null;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeTracker();
  });
} else {
  new YouTubeTracker();
}

console.log('YouTube tracker script loaded');
