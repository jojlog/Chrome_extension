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

  handleMutations(mutations) {
    super.handleMutations(mutations);
    // TikTok profile tabs often update without URL changes.
    this.handleUrlChange();
  }

  shouldAutoImport() {
    if (!this.settings?.autoImportSavedPages || this.settings?.autoImportPaused) {
      return false;
    }
    if (this.pageMode && this.pageMode !== 'feed') {
      return true;
    }
    if (this.detectProfileGridMode()) {
      return true;
    }
    return this.hasActiveImportableButtons();
  }

  triggerManualImport() {
    if (!this.settings?.autoImportSavedPages || this.settings?.autoImportPaused) {
      return false;
    }
    if (this.pageMode && this.pageMode !== 'feed') {
      this.scheduleBulkCapture();
      return true;
    }
    if (this.detectProfileGridMode()) {
      this.scheduleBulkCapture();
      return true;
    }
    if (this.hasActiveImportableButtons()) {
      this.scheduleBulkCapture();
      return true;
    }
    return false;
  }

  startAutoScrollImport(origin = 'overlay') {
    if (this.autoScrollState.running && !this.autoScrollState.paused) {
      return { started: false, reason: 'already_running' };
    }

    if (!this.pageMode || this.pageMode === 'feed') {
      this.autoScrollContainer = this.getScrollContainer(true);
      this.autoScrollState.running = true;
      this.autoScrollState.paused = false;
      this.autoScrollState.stopped = false;
      this.autoScrollState.completed = false;
      this.autoScrollState.importedCount = 0;
      this.autoScrollState.startTime = Date.now();
      this.autoScrollState.lastScrollHeight = this.getScrollHeight();
      this.autoScrollState.noGrowthStreak = 0;
      this.autoScrollState.stepCount = 0;

      this.ensureAutoScrollOverlay();
      this.updateAutoScrollOverlay('Running', 'Auto-scroll import started. Looking for liked/saved posts.');

      this.bindAutoScrollInterrupts();
      this.runAutoScrollLoop();
      return { started: true };
    }

    return super.startAutoScrollImport(origin);
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
    const gridMode = this.detectProfileGridMode();
    if ((this.pageMode && this.pageMode !== 'feed') || gridMode) {
      if (TikTokSelectors.PROFILE_GRID_ITEM) {
        return [...TikTokSelectors.PROFILE_GRID_ITEM, ...TikTokSelectors.POST_CONTAINER];
      }
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
    const gridLink = postElement?.closest?.('a[href*="/video/"]');
    if (gridLink?.href) {
      return gridLink.href;
    }
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
    let text = textElement ? ContentExtractor.extractText(textElement) : '';
    if (!text) {
      const altImage = postElement.querySelector?.('img[alt]') || postElement.closest?.('img[alt]');
      const altText = altImage?.getAttribute?.('alt') || '';
      text = altText;
    }
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
    const posterUrl = this.extractPosterUrl(videoElement);
    const fallbackImages = posterUrl ? [] : this.extractInlineThumbnails(postElement);

    const url = this.extractPostUrl(postElement);
    const hashtags = ContentExtractor.extractHashtags(text);

    return {
      text: ContentExtractor.cleanText(text),
      imageUrls: posterUrl ? [posterUrl] : fallbackImages, // Use poster or inline thumbnail
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

      let matchedSignal = false;
      if (normalizedMusic && this.normalizeId(item.musicId) === normalizedMusic) {
        matchedSignal = true;
      } else if (normalizedMusicTitle && item.musicTitleNormalized) {
        if (item.musicTitleNormalized.includes(normalizedMusicTitle) || normalizedMusicTitle.includes(item.musicTitleNormalized)) {
          matchedSignal = true;
        }
      } else if (normalizedText && item.descNormalized) {
        if (item.descNormalized.includes(normalizedText.slice(0, 30)) || normalizedText.includes(item.descNormalized.slice(0, 30))) {
          matchedSignal = true;
        }
      }

      if (matchedSignal) {
        bestMatch = item;
        break;
      }
    }

    if (!bestMatch && typeof scrollIndex === 'number' && scrollIndex >= 0 && scrollIndex < items.length) {
      bestMatch = items[scrollIndex];
    }

    if (!bestMatch && items.length === 1) {
      bestMatch = items[0];
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
      this.ingestFeedItems(data.items);
    });
  }

  ingestFeedItems(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const normalized = items.map(item => {
      if (!item || !item.id) return null;
      const author = typeof item.author === 'string' ? item.author : (item.authorUniqueId || item.authorNickname || item.authorName);
      if (!author) return null;
      return {
        id: String(item.id),
        author: String(author),
        authorUniqueId: item.authorUniqueId ? String(item.authorUniqueId) : '',
        authorNickname: item.authorNickname ? String(item.authorNickname) : '',
        desc: item.desc ? String(item.desc) : '',
        descNormalized: item.desc ? this.normalizeText(String(item.desc)) : '',
        musicId: item.musicId ? String(item.musicId) : '',
        musicTitleNormalized: item.musicTitle ? this.normalizeText(String(item.musicTitle)) : (item.musicTitleNormalized || ''),
        shareUrl: item.shareUrl ? String(item.shareUrl) : ''
      };
    }).filter(Boolean);
    if (normalized.length === 0) return;
    this.mergeFeedItems(normalized);
  }

  ingestFeedData(data) {
    const items = this.extractItemsFromFeedData(data);
    if (!items || items.length === 0) return;
    this.mergeFeedItems(items);
  }

  mergeFeedItems(items) {
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
      const authorDirect = typeof item?.author === 'string' ? item.author : '';
      const authorUniqueId = item?.author?.uniqueId || item?.author?.unique_id || item?.author?.authorName;
      const authorNickname = item?.author?.nickname || item?.author?.nick_name || item?.author?.nickname || item?.author?.displayName;
      const author = authorDirect || authorUniqueId || authorNickname || item?.authorName;
      const musicId = item?.music?.id || item?.music?.musicId || item?.music?.mid || item?.music?.id_str;
      const musicTitle = item?.music?.title || item?.music?.music_name || item?.music?.musicName || item?.music?.songName || item?.musicTitle;
      const shareUrl = item?.shareInfo?.share_url || item?.shareInfo?.shareUrl || item?.shareMeta?.share_url || item?.shareMeta?.shareUrl || item?.share_url || item?.shareUrl || item?.share_url;
      if (!id || !author) return null;
      return {
        id: String(id),
        author: String(author),
        authorUniqueId: authorUniqueId ? String(authorUniqueId) : '',
        authorNickname: authorNickname ? String(authorNickname) : '',
        desc: desc ? String(desc) : '',
        descNormalized: desc ? this.normalizeText(String(desc)) : '',
        musicId: musicId ? String(musicId) : (item.musicId ? String(item.musicId) : ''),
        musicTitleNormalized: musicTitle ? this.normalizeText(String(musicTitle)) : (item.musicTitleNormalized || ''),
        shareUrl: shareUrl ? String(shareUrl) : (item.shareUrl ? String(item.shareUrl) : '')
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

  extractPosterUrl(videoElement) {
    if (!videoElement) return '';
    const poster = videoElement.getAttribute('poster') ||
      videoElement.getAttribute('data-poster') ||
      videoElement.dataset?.poster ||
      videoElement.dataset?.src;
    if (poster && typeof poster === 'string' && poster.startsWith('http')) {
      return poster;
    }
    return '';
  }

  extractInlineThumbnails(postElement) {
    if (!postElement) return [];
    const candidates = ContentExtractor.extractImageUrls(
      postElement,
      'img[src], img[srcset], picture img',
      (img) => {
        const src = (img.currentSrc || img.src || '').toLowerCase();
        const alt = (img.getAttribute('alt') || '').toLowerCase();
        if (!src) return false;
        if (src.includes('avatar') || src.includes('profile')) return false;
        if (alt.includes('avatar') || alt.includes('profile')) return false;
        return src.includes('tiktokcdn') || src.includes('ttcdn') || src.includes('tiktok');
      }
    );
    return candidates.slice(0, 3);
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
      postElement.closest?.('a[href*="/video/"]') ||
      ContentExtractor.findWithFallback(postElement, TikTokSelectors.PROFILE_GRID_LINK);
    const url = link ? link.href : window.location.href;

    const imageUrls = ContentExtractor.extractImageUrls(
      postElement,
      TikTokSelectors.PROFILE_GRID_THUMB.join(',')
    );

    const imageEl = postElement.querySelector?.('img[alt]') || postElement.closest?.('img[alt]');
    const altText = imageEl?.getAttribute?.('alt') || '';

    return {
      text: ContentExtractor.cleanText(altText || ''),
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
    let pathname = '';
    let tab = '';
    let hash = '';
    try {
      const parsed = new URL(window.location.href);
      pathname = parsed.pathname || '';
      tab = (parsed.searchParams.get('tab') || '').toLowerCase();
      hash = (parsed.hash || '').toLowerCase();
    } catch (error) {
      pathname = window.location.pathname || '';
      tab = '';
      hash = (window.location.hash || '').toLowerCase();
    }

    const normalizedPath = pathname.replace(/\/+$/, '');

    if (normalizedPath.match(/^\/@[^/]+\/(?:favorites?|favourites?)(?:\/|$)/)) {
      return 'favorites';
    }
    if (normalizedPath.match(/^\/@[^/]+\/(?:liked|likes)(?:\/|$)/)) {
      return 'likes';
    }

    if (tab) {
      if (['favorite', 'favorites', 'favourite', 'favourites', 'saved'].includes(tab)) {
        return 'favorites';
      }
      if (['liked', 'likes'].includes(tab)) {
        return 'likes';
      }
    }

    if (hash) {
      if (hash.includes('favorite') || hash.includes('favourite') || hash.includes('saved')) {
        return 'favorites';
      }
      if (hash.includes('liked') || hash.includes('likes')) {
        return 'likes';
      }
    }

    const domMode = this.detectPageModeFromDom();
    if (domMode) return domMode;

    return null;
  }

  detectPageModeFromDom() {
    return this.detectProfileGridMode() || null;
  }

  detectProfileGridMode() {
    const root = this.getProfileGridRoot();

    const gridLikes = root?.querySelector?.('[data-e2e="user-liked-item"], [data-e2e*="user-liked-item"]') ||
      document.querySelector('[data-e2e="user-liked-item"], [data-e2e*="user-liked-item"], [data-e2e="user-liked-item-list"], [data-e2e*="user-liked-item-list"]');
    if (gridLikes) return 'likes';

    const gridFavorites = root?.querySelector?.('[data-e2e="user-favorite-item"], [data-e2e*="user-favorite-item"], [data-e2e="user-favourite-item"], [data-e2e*="user-favourite-item"]') ||
      document.querySelector('[data-e2e="user-favorite-item"], [data-e2e*="user-favorite-item"], [data-e2e="user-favourite-item"], [data-e2e*="user-favourite-item"], [data-e2e="user-favorite-item-list"], [data-e2e*="user-favorite-item-list"], [data-e2e="user-favourite-item-list"], [data-e2e*="user-favourite-item-list"]');
    if (gridFavorites) return 'favorites';

    const tabMode = this.detectActiveProfileTab();
    if (tabMode) return tabMode;

    return null;
  }

  detectActiveProfileTab() {
    const tablist = document.querySelector('[role="tablist"]');
    if (tablist) {
      const tabs = tablist.querySelectorAll('[role="tab"], button, a, div, span');
      for (const tabEl of tabs) {
        if (!this.isTabActive(tabEl)) continue;
        const label = (tabEl.getAttribute('aria-label') || tabEl.textContent || '').toLowerCase();
        const dataE2e = (tabEl.getAttribute('data-e2e') || '').toLowerCase();
        const combined = `${label} ${dataE2e}`;
        if (combined.includes('liked') || combined.includes('likes')) {
          return 'likes';
        }
        if (combined.includes('favorite') || combined.includes('favourite') || combined.includes('saved')) {
          return 'favorites';
        }
      }
    }

    const tabSelectors = [
      '[role="tab"]',
      '[data-e2e*="tab"]',
      '[data-e2e="liked"]',
      '[data-e2e="favorites"]',
      '[data-e2e="favourites"]',
      '[data-e2e="liked-tab"]',
      '[data-e2e="favorites-tab"]',
      '[data-e2e="favourites-tab"]',
      'button[aria-selected="true"]',
      'a[aria-selected="true"]',
      '[data-selected="true"]',
      '[data-active="true"]',
      '[data-state="active"]'
    ];
    const candidates = document.querySelectorAll(tabSelectors.join(','));
    for (const candidate of candidates) {
      const tabEl = candidate.closest('[role="tab"]') || candidate;
      if (!this.isTabActive(tabEl)) continue;
      const label = (tabEl.getAttribute('aria-label') || tabEl.textContent || '').toLowerCase();
      const dataE2e = (tabEl.getAttribute('data-e2e') || '').toLowerCase();
      const combined = `${label} ${dataE2e}`;
      if (combined.includes('liked') || combined.includes('likes')) {
        return 'likes';
      }
      if (combined.includes('favorite') || combined.includes('favourite') || combined.includes('saved')) {
        return 'favorites';
      }
    }

    return null;
  }

  isTabActive(tabEl) {
    if (!tabEl || !(tabEl instanceof Element)) return false;
    const ariaSelected = tabEl.getAttribute('aria-selected');
    if (ariaSelected === 'true') return true;
    const ariaCurrent = tabEl.getAttribute('aria-current');
    if (ariaCurrent && ariaCurrent !== 'false') return true;
    const dataActive = tabEl.getAttribute('data-active');
    if (dataActive && dataActive !== 'false') return true;
    const dataState = tabEl.getAttribute('data-state');
    if (dataState && dataState.toLowerCase() === 'active') return true;
    const className = tabEl.className;
    if (typeof className === 'string') {
      const lower = className.toLowerCase();
      if (lower.includes('active') || lower.includes('selected')) return true;
    }
    return false;
  }

  getProfileGridRoot() {
    const selectors = TikTokSelectors.PROFILE_GRID_ROOT || [];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return document.querySelector('main') || document.querySelector('[role="main"]');
  }

  getProfileGridPosts() {
    const root = this.getProfileGridRoot();
    const selectors = TikTokSelectors.PROFILE_GRID_ITEM || [];
    const collected = new Set();

    for (const selector of selectors) {
      try {
        (root || document).querySelectorAll(selector).forEach(node => {
          collected.add(node);
        });
      } catch (error) {
        console.warn('Invalid selector:', selector);
      }
    }

    const thumbCandidates = (root || document).querySelectorAll('img[alt], picture img, img[src], img[srcset]');
    thumbCandidates.forEach(img => {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const src = (img.currentSrc || img.src || '').toLowerCase();
      if (!src) return;
      const looksLikeTile = src.includes('tiktokcdn') || src.includes('ttcdn') || alt.includes('created by');
      if (!looksLikeTile) return;
      collected.add(img);
    });

    const posts = new Set();
    collected.forEach(node => {
      const link = node.closest?.('a[href*="/video/"]');
      if (link) {
        posts.add(link);
        return;
      }
      const clickable = node.closest?.('[role="link"], [data-e2e*="item"], article, div');
      if (clickable) {
        posts.add(clickable);
      }
    });

    return Array.from(posts);
  }

  isLikelyProfileGrid() {
    const path = window.location.pathname || '';
    if (!path.startsWith('/@')) return false;
    const posts = this.getProfileGridPosts();
    return posts.length > 0;
  }

  hasActiveImportableButtons() {
    const likeButtons = this.findActionButtons(TikTokSelectors.LIKE_BUTTON);
    for (const button of likeButtons) {
      if (this.isActionActive(button, 'like')) return true;
    }
    const favoriteButtons = this.findActionButtons(TikTokSelectors.FAVORITE_BUTTON);
    for (const button of favoriteButtons) {
      if (this.isActionActive(button, 'favorite')) return true;
    }
    return false;
  }

  findActionButtons(selectors) {
    const buttons = [];
    if (!selectors) return buttons;
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      document.querySelectorAll(selector).forEach(node => buttons.push(node));
      if (buttons.length > 0) break;
    }
    return buttons;
  }

  findActionButtonInPost(postElement, selectors) {
    if (!postElement) return null;
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const found = postElement.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  isActionActive(element, kind) {
    const button = element?.closest('button') || element;
    const candidates = [button, element].filter(Boolean);
    for (const node of candidates) {
      const ariaPressed = node.getAttribute?.('aria-pressed');
      if (ariaPressed === 'true' || ariaPressed === 'mixed') return true;

      const dataState = (node.getAttribute?.('data-state') || '').toLowerCase();
      if (['active', 'selected', 'on', 'checked'].includes(dataState)) return true;

      const dataActive = (node.getAttribute?.('data-active') || '').toLowerCase();
      if (['true', '1', 'yes'].includes(dataActive)) return true;

      const dataE2e = (node.getAttribute?.('data-e2e') || '').toLowerCase();
      if (kind === 'like' && dataE2e.includes('liked')) return true;
      if (kind === 'favorite' && (dataE2e.includes('favorite') || dataE2e.includes('favourite') || dataE2e.includes('saved'))) {
        if (dataE2e.includes('active') || dataE2e.includes('selected')) return true;
      }

      const ariaLabel = (node.getAttribute?.('aria-label') || '').toLowerCase();
      if (ariaLabel) {
        if (kind === 'like') {
          if (ariaLabel.includes('liked') || ariaLabel.includes('unlike') || ariaLabel.includes('remove like')) {
            return true;
          }
        } else if (kind === 'favorite') {
          if (ariaLabel.includes('remove') && (ariaLabel.includes('favorite') || ariaLabel.includes('favourite') || ariaLabel.includes('saved'))) {
            return true;
          }
          if (ariaLabel.includes('favorited') || ariaLabel.includes('favourited') || ariaLabel.includes('saved')) {
            if (!ariaLabel.includes('add to')) return true;
          }
        }
      }

      const className = node.className;
      if (typeof className === 'string') {
        const lower = className.toLowerCase();
        if (lower.includes('active') || lower.includes('selected') || lower.includes('pressed')) return true;
        if (kind === 'like' && lower.includes('liked')) return true;
        if (kind === 'favorite' && (lower.includes('favorited') || lower.includes('favourited') || lower.includes('saved'))) {
          return true;
        }
      }
    }
    return false;
  }

  mergeInteractionTypes(existingType, incomingType) {
    const existing = String(existingType || '').split(',').map(value => value.trim()).filter(Boolean);
    const incoming = String(incomingType || '').split(',').map(value => value.trim()).filter(Boolean);
    const merged = Array.from(new Set([...existing, ...incoming])).filter(Boolean);
    return merged.join(',');
  }

  getActiveImportTypesForPost(postElement) {
    const types = [];
    const likeButton = this.findActionButtonInPost(postElement, TikTokSelectors.LIKE_BUTTON);
    if (likeButton && this.isActionActive(likeButton, 'like')) {
      types.push('imported_like');
    }
    const favoriteButton = this.findActionButtonInPost(postElement, TikTokSelectors.FAVORITE_BUTTON);
    if (favoriteButton && this.isActionActive(favoriteButton, 'favorite')) {
      types.push('imported_save');
    }
    return types;
  }

  async bulkCaptureVisiblePosts(options = {}) {
    if (this.pageMode && this.pageMode !== 'feed') {
      return await super.bulkCaptureVisiblePosts(options);
    }
    const gridMode = this.detectProfileGridMode();
    const forcedGridMode = (!gridMode && options.force && this.isLikelyProfileGrid())
      ? (this.detectActiveProfileTab() || 'favorites')
      : null;
    const effectiveGridMode = gridMode || forcedGridMode;
    if (effectiveGridMode) {
      const force = options.force === true;
      const suppressSummary = options.suppressSummary === true;
      if (!force && !this.shouldAutoImport()) return 0;
      this.cancelBulkCapture();

      const previousMode = this.pageMode;
      this.pageMode = effectiveGridMode;

      const posts = this.getProfileGridPosts();
      let capturedCount = 0;
      const interactionType = this.getInteractionTypeForPageMode();

      for (const post of posts) {
        try {
          if (!this.isElementVisible(post)) continue;
          const snapshot = this.buildImportSnapshot(post);
          const dedupKey = snapshot?.contentKey || this.generatePostId(post);
          if (this.capturedPostIds.has(dedupKey)) continue;
          this.capturedPostIds.add(dedupKey);

          const saved = await this.captureImportedInteraction(interactionType, post, snapshot);
          if (saved) {
            capturedCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`${this.platform}: Error capturing post:`, error);
        }
      }

      if (capturedCount > 0 && !suppressSummary && !this.settings?.suppressImportNotifications) {
        if (window.statusPopupManager) {
          window.statusPopupManager.show({
            success: true,
            saveSuccess: true,
            interactionType: `${capturedCount} ${this.pageMode}`,
            platform: this.platform,
            categories: ['Imported'],
            aiProcessed: false
          });
        }
      }

      this.pageMode = previousMode;
      return capturedCount;
    }

    const force = options.force === true;
    const suppressSummary = options.suppressSummary === true;
    if (!force && !this.shouldAutoImport()) return 0;
    this.cancelBulkCapture();

    const selectors = this.getPostContainerSelectors();
    if (!selectors || selectors.length === 0) return 0;

    const posts = ContentExtractor.findAllWithFallback(document, selectors);
    let capturedCount = 0;

    for (const post of posts) {
      try {
        if (!this.isElementVisible(post)) continue;
        const activeTypes = this.getActiveImportTypesForPost(post);
        if (activeTypes.length === 0) continue;

        const snapshot = this.buildImportSnapshot(post);
        const dedupKey = snapshot?.contentKey || this.generatePostId(post);
        if (this.capturedPostIds.has(dedupKey)) continue;
        this.capturedPostIds.add(dedupKey);

        const interactionType = activeTypes.join(',');
        const saved = await this.captureImportedInteraction(interactionType, post, snapshot);
        if (saved) {
          capturedCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`${this.platform}: Error capturing post:`, error);
      }
    }

    if (capturedCount > 0 && !suppressSummary && !this.settings?.suppressImportNotifications) {
      if (window.statusPopupManager) {
        window.statusPopupManager.show({
          success: true,
          saveSuccess: true,
          interactionType: `${capturedCount} imported`,
          platform: this.platform,
          categories: ['Imported'],
          aiProcessed: false
        });
      }
    }

    return capturedCount;
  }

  async captureImportedInteraction(type, postElement, snapshot = null) {
    const data = snapshot || this.buildImportSnapshot(postElement) || {};
    const content = data.content || {};
    const metadata = data.metadata || {};
    const loggedInUser = data.loggedInUser || null;
    const hasSnapshotKey = Object.prototype.hasOwnProperty.call(data, 'contentKey');
    const contentKey = hasSnapshotKey ? data.contentKey : ContentExtractor.createContentKey(this.platform, content.url, content.text);

    try {
      const existing = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_INTERACTION_BY_KEY,
        contentKey
      });
      const existingInteraction = existing?.success ? existing.data : null;
      if (existingInteraction?.id) {
        const mergedType = this.mergeInteractionTypes(existingInteraction.interactionType, type);
        if (mergedType !== existingInteraction.interactionType) {
          await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.UPDATE_INTERACTION,
            id: existingInteraction.id,
            updates: {
              interactionType: mergedType,
              importedFrom: existingInteraction.importedFrom || this.pageMode || 'feed'
            }
          });
        }
        return false;
      }
    } catch (error) {
      // Ignore duplicate lookup errors and fall back to save.
    }

    const interaction = {
      id: ContentExtractor.generatePostId(this.platform, content.url, content.text),
      platform: this.platform,
      interactionType: type,
      timestamp: Date.now(),
      viewDuration: 0,
      savedBy: loggedInUser,
      contentKey: contentKey,
      content: content,
      metadata: metadata,
      categories: [],
      aiProcessed: false,
      tags: [],
      notes: '',
      isFavorite: false,
      importedFrom: this.pageMode || 'feed'
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SAVE_INTERACTION,
        data: interaction
      });

      if (response && response.success && !response.skippedDuplicate) {
        return true;
      }
      return false;
    } catch (error) {
      console.error(`${this.platform}: Error saving imported interaction:`, error);
      return false;
    }
  }

  getScrollContainerOverride() {
    const candidates = [
      '[data-e2e="user-profile"]',
      '[data-e2e="favorites"]',
      '[data-e2e="liked"]',
      '[data-e2e="user-post-item-list"]',
      '[data-e2e="search-result-list"]',
      'main[role="main"]',
      '[role="main"]'
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
    new TikTokTracker();
  });
} else {
  new TikTokTracker();
}

console.log('TikTok tracker script loaded');
