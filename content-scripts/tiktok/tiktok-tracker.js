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
    this.stateCache = { ts: 0, items: [] };
    this.networkHookInstalled = false;
  }

  async init() {
    await super.init();
    this.installNetworkHook();
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
    return button.closest('article[data-e2e="recommend-list-item-container"]') ||
      button.closest('div[data-e2e="recommend-list-item-container"]') ||
      button.closest('article[class*="ArticleItemContainer"]') ||
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
    return element.tagName === 'ARTICLE' ||
      element.getAttribute('data-e2e') === 'recommend-list-item-container' ||
      element.classList.contains('DivItemContainerV2');
  }

  extractPostUrl(postElement) {
    const link = ContentExtractor.findWithFallback(postElement, TikTokSelectors.POST_LINK);
    if (link && link.href) return link.href;

    const authorLink = ContentExtractor.findWithFallback(postElement, TikTokSelectors.AUTHOR_LINK);
    const authorHandle = authorLink?.href?.match(/\/@([^\/\?]+)/)?.[1] || '';
    const authorText = this.extractAuthorText(postElement);
    const videoId = this.extractVideoId(postElement);
    if (videoId && authorHandle) {
      return `https://www.tiktok.com/@${authorHandle}/video/${videoId}`;
    }
    const textElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.POST_TEXT);
    const text = textElement ? ContentExtractor.extractText(textElement) : '';
    const musicId = this.extractMusicId(postElement);
    const musicTitle = this.extractMusicTitle(postElement);
    const scrollIndex = this.extractScrollIndex(postElement);
    const derived = this.resolveUrlFromState(authorHandle, authorText, text, musicId, musicTitle, scrollIndex);
    if (derived) return derived;

    return window.location.href;
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

  resolveUrlFromState(authorHandle, authorText = '', text = '', musicId = '', musicTitle = '', scrollIndex = null) {
    const items = this.getStateItems();
    if (!items || items.length === 0) return '';
    const normalizedAuthor = this.normalizeHandle(authorHandle);
    const normalizedAuthorText = this.normalizeHandle(authorText);
    const normalizedText = this.normalizeText(text);
    const normalizedMusic = this.normalizeId(musicId);
    const normalizedMusicTitle = this.normalizeText(musicTitle);

    let bestMatch = null;
    for (const item of items) {
      if (!item || !item.id) continue;
      if (normalizedAuthor || normalizedAuthorText) {
        const authorCandidates = [
          this.normalizeHandle(item.author),
          this.normalizeHandle(item.authorUniqueId),
          this.normalizeHandle(item.authorNickname)
        ].filter(Boolean);
        if (normalizedAuthor && !authorCandidates.includes(normalizedAuthor)) continue;
        if (normalizedAuthorText && !authorCandidates.includes(normalizedAuthorText)) continue;
      }
      if (normalizedMusic && this.normalizeId(item.musicId) === normalizedMusic) {
        bestMatch = item;
        break;
      }
      if (normalizedMusicTitle && item.musicTitleNormalized) {
        if (item.musicTitleNormalized.includes(normalizedMusicTitle) || normalizedMusicTitle.includes(item.musicTitleNormalized)) {
          bestMatch = item;
          break;
        }
      }
      if (normalizedText && item.descNormalized) {
        if (!item.descNormalized.includes(normalizedText.slice(0, 30)) && !normalizedText.includes(item.descNormalized.slice(0, 30))) {
          continue;
        }
      }
      bestMatch = item;
      break;
    }

    if (!bestMatch && (normalizedAuthor || normalizedAuthorText)) {
      bestMatch = items.find(item => {
        const authorCandidates = [
          this.normalizeHandle(item.author),
          this.normalizeHandle(item.authorUniqueId),
          this.normalizeHandle(item.authorNickname)
        ].filter(Boolean);
        if (normalizedAuthor && authorCandidates.includes(normalizedAuthor)) return true;
        if (normalizedAuthorText && authorCandidates.includes(normalizedAuthorText)) return true;
        return false;
      }) || null;
    }

    if (!bestMatch && typeof scrollIndex === 'number' && scrollIndex >= 0 && scrollIndex < items.length) {
      bestMatch = items[scrollIndex];
    }

    if (!bestMatch) return '';

    if (bestMatch.shareUrl) return bestMatch.shareUrl;
    const handle = this.normalizeHandle(bestMatch.author) || normalizedAuthor;
    if (!handle) return '';
    return `https://www.tiktok.com/@${handle}/video/${bestMatch.id}`;
  }

  getStateItems() {
    const now = Date.now();
    if (this.stateCache.items.length > 0 && (now - this.stateCache.ts) < 10000) {
      return this.stateCache.items;
    }
    const candidates = [];
    const globals = [
      window.SIGI_STATE,
      window.__UNIVERSAL_DATA_FOR_REHYDRATION__,
      window.__$UNIVERSAL_DATA$__,
      window.__liveRecsData,
      window.__INIT_VMOK_DEPLOY_GLOBAL_DATA__,
      window.__NEXT_DATA__,
      window.__INITIAL_STATE__,
      window.dataLayer
    ];
    const scriptIds = ['SIGI_STATE', '__UNIVERSAL_DATA_FOR_REHYDRATION__', '__NEXT_DATA__'];
    for (const id of scriptIds) {
      const text = document.getElementById(id)?.textContent;
      if (text) {
        try {
          globals.push(JSON.parse(text));
        } catch (error) {
          continue;
        }
      }
    }

    for (const root of globals) {
      if (!root) continue;
      this.collectItemsFromState(root, candidates);
      if (candidates.length > 0) break;
    }

    this.stateCache = { ts: now, items: candidates };
    return candidates;
  }

  installNetworkHook() {
    if (this.networkHookInstalled) return;
    this.networkHookInstalled = true;

    chrome.runtime.sendMessage({ type: 'INJECT_TIKTOK_HOOK' }).catch(() => {});
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const data = event.data || {};
      if (data.type !== 'CT_TIKTOK_FEED') return;
      console.log('tiktok: received feed items', data.items?.slice?.(0, 2));
      this.ingestFeedData({ itemList: data.items });
    });
  }

  ingestFeedData(data) {
    const items = this.extractItemsFromFeedData(data);
    if (!items || items.length === 0) return;
    const merged = new Map();
    for (const item of this.stateCache.items) {
      if (item?.id) merged.set(item.id, item);
    }
    items.forEach(item => {
      if (item?.id) merged.set(item.id, item);
    });
    this.stateCache = { ts: Date.now(), items: Array.from(merged.values()) };
  }

  extractItemsFromFeedData(data) {
    if (!data || typeof data !== 'object') return [];
    const list = data.itemList || data.item_list || data.aweme_list || data.itemListData || data.data?.item_list || data.data?.itemList;
    if (!Array.isArray(list)) return [];
    return list.map(item => {
      const id = item?.id || item?.aweme_id || item?.itemId;
      const desc = item?.desc || item?.description || item?.title;
      const authorUniqueId = item?.author?.uniqueId || item?.author?.unique_id || item?.author?.authorName;
      const authorNickname = item?.author?.nickname || item?.author?.nick_name || item?.author?.nickname || item?.author?.displayName;
      const author = authorUniqueId || authorNickname || item?.authorName;
      const musicId = item?.music?.id || item?.music?.musicId || item?.music?.mid || item?.music?.id_str;
      const musicTitle = item?.music?.title || item?.music?.music_name || item?.music?.musicName || item?.music?.songName;
      const shareUrl = item?.shareInfo?.share_url || item?.shareInfo?.shareUrl || item?.shareMeta?.share_url || item?.shareMeta?.shareUrl || item?.share_url || item?.shareUrl;
      if (!id || !author) return null;
      return {
        id: String(id),
        author: String(author),
        authorUniqueId: authorUniqueId ? String(authorUniqueId) : '',
        authorNickname: authorNickname ? String(authorNickname) : '',
        desc: desc ? String(desc) : '',
        descNormalized: desc ? this.normalizeText(String(desc)) : '',
        musicId: musicId ? String(musicId) : '',
        musicTitleNormalized: musicTitle ? this.normalizeText(String(musicTitle)) : '',
        shareUrl: shareUrl ? String(shareUrl) : ''
      };
    }).filter(Boolean);
  }

  collectItemsFromState(root, out) {
    const stack = [root];
    const seen = new Set();
    let steps = 0;
    while (stack.length && steps < 5000) {
      const node = stack.pop();
      steps += 1;
      if (!node || typeof node !== 'object') continue;
      if (seen.has(node)) continue;
      seen.add(node);

      if (node.itemStruct && typeof node.itemStruct === 'object') {
        this.maybePushItem(node.itemStruct, out);
      }
      this.maybePushItem(node, out);

      for (const value of Object.values(node)) {
        if (value && typeof value === 'object') {
          stack.push(value);
        }
      }
    }
  }

  maybePushItem(node, out) {
    const id = node?.id || node?.aweme_id || node?.itemId;
    const desc = node?.desc || node?.description || node?.title;
    const author = node?.author || node?.authorName || node?.authorInfo?.uniqueId || node?.authorInfo?.nickname;
    if (!id || !author) return;
    const shareUrl = node?.shareInfo?.share_url || node?.shareMeta?.share_url || node?.shareUrl || node?.share_url;
    out.push({
      id: String(id),
      author: String(author),
      desc: desc ? String(desc) : '',
      descNormalized: desc ? this.normalizeText(String(desc)) : '',
      shareUrl: shareUrl ? String(shareUrl) : ''
    });
  }

  normalizeHandle(value) {
    return String(value || '').replace(/^@/, '').trim().toLowerCase();
  }

  normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeId(value) {
    return String(value || '').replace(/\D+/g, '').trim();
  }

  extractMusicId(postElement) {
    if (!postElement) return '';
    const musicLink = postElement.querySelector('a[href*="/music/"]');
    const href = musicLink?.href || '';
    const match = href.match(/\/music\/[^\/]+-(\d+)/);
    if (match && match[1]) return match[1];
    return '';
  }

  extractMusicTitle(postElement) {
    if (!postElement) return '';
    const musicLink = postElement.querySelector('a[href*="/music/"]');
    if (!musicLink) return '';
    return ContentExtractor.extractText(musicLink);
  }

  extractScrollIndex(postElement) {
    if (!postElement) return null;
    const raw = postElement.getAttribute('data-scroll-index');
    if (raw != null) {
      const value = Number.parseInt(raw, 10);
      if (!Number.isNaN(value)) return value;
    }
    const id = postElement.getAttribute('id') || '';
    const idMatch = id.match(/(\d+)/);
    if (idMatch && idMatch[1]) {
      const value = Number.parseInt(idMatch[1], 10);
      if (!Number.isNaN(value)) return value;
    }
    const mediaId = postElement.querySelector('section[id^="media-card-"]')?.getAttribute('id') || '';
    const mediaMatch = mediaId.match(/(\d+)/);
    if (mediaMatch && mediaMatch[1]) {
      const value = Number.parseInt(mediaMatch[1], 10);
      if (!Number.isNaN(value)) return value;
    }
    const value = Number.parseInt(raw, 10);
    return Number.isNaN(value) ? null : value;
  }

  extractAuthorText(postElement) {
    const authorElement = ContentExtractor.findWithFallback(postElement, TikTokSelectors.AUTHOR);
    return authorElement ? ContentExtractor.extractText(authorElement) : '';
  }

  extractVideoId(postElement) {
    if (!postElement) return '';
    const selectors = [
      '[data-video-id]',
      '[data-id]',
      '[data-item-id]',
      '[data-aweme-id]',
      '[data-vid]',
      '[data-video]',
      'a[href*="/video/"]',
      'video'
    ];
    const nodes = [postElement, ...Array.from(postElement.querySelectorAll(selectors.join(','))).slice(0, 200)];
    for (const node of nodes) {
      const candidate = this.extractVideoIdFromNode(node);
      if (candidate) return candidate;
    }
    return '';
  }

  extractVideoIdFromNode(node) {
    if (!node) return '';
    const attrs = ['data-video-id', 'data-id', 'data-item-id', 'data-aweme-id', 'data-vid', 'data-video', 'id'];
    for (const attr of attrs) {
      const value = node.getAttribute?.(attr);
      const found = this.extractVideoIdFromValue(value);
      if (found) return found;
    }

    const href = node.getAttribute?.('href') || node.href;
    const fromHref = this.extractVideoIdFromValue(href);
    if (fromHref) return fromHref;

    const data = node.dataset || {};
    for (const value of Object.values(data)) {
      const found = this.extractVideoIdFromValue(value);
      if (found) return found;
    }

    return '';
  }

  extractVideoIdFromValue(value) {
    if (!value || typeof value !== 'string') return '';
    const urlMatch = value.match(/\/video\/(\d{10,25})/);
    if (urlMatch && urlMatch[1]) return urlMatch[1];
    const idMatch = value.match(/\b(\d{10,25})\b/);
    if (idMatch && idMatch[1]) return idMatch[1];
    return '';
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
