// Background Service Worker - Coordinates extension functionality
// Import storage manager and AI categorizer
import { StorageManager } from '../lib/storage-manager.js';
import { AICategorizer } from '../lib/ai-categorizer.js';

// Initialize managers
const storageManager = new StorageManager();
const aiCategorizer = new AICategorizer();

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension started');
  await storageManager.initialize();
  await aiCategorizer.init();
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First time installation
    await storageManager.initialize();
    await aiCategorizer.init();

    // Show welcome notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
      title: 'Social Media Content Tracker Installed!',
      message: 'Start browsing Instagram, Threads, Twitter, LinkedIn, or TikTok. Your interactions will be automatically tracked.',
      priority: 2
    });

    // Open dashboard welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard/dashboard.html')
    });
  } else if (details.reason === 'update') {
    // Extension updated
    await storageManager.initialize(); // Ensure any new fields are added
    await aiCategorizer.init();
  }
});

// Listen for messages from content scripts and popup/dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type);

  // Handle async responses
  handleMessage(message, sender)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });

  // Return true to indicate we'll send a response asynchronously
  return true;
});

/**
 * Handle incoming messages
 */
async function handleMessage(message, sender) {
  switch (message.type) {
    case 'SAVE_INTERACTION':
      return await handleSaveInteraction(message.data, sender);

    case 'GET_INTERACTIONS':
      return await handleGetInteractions(message.filters);

    case 'GET_INTERACTION_BY_ID':
      return await handleGetInteractionById(message.id);
    case 'GET_INTERACTION_BY_KEY':
      return await handleGetInteractionByKey(message.contentKey);

    case 'UPDATE_INTERACTION':
      return await handleUpdateInteraction(message.id, message.updates);

    case 'DELETE_INTERACTION':
      return await handleDeleteInteraction(message.id);

    case 'GET_SETTINGS':
      return await handleGetSettings();

    case 'UPDATE_SETTINGS':
      return await handleUpdateSettings(message.updates);

    case 'GET_METADATA':
      return await handleGetMetadata();

    case 'GET_STATISTICS':
      return await handleGetStatistics();

    case 'GET_CATEGORIES':
      return await handleGetCategories();

    case 'EXPORT_DATA':
      return await handleExportData();

    case 'PROCESS_AI_QUEUE':
      return await handleProcessAIQueue();

    case 'GET_USER_CATEGORIES':
      return await handleGetUserCategories();

    case 'UPDATE_USER_CATEGORIES':
      return await handleUpdateUserCategories(message.categories);

    case 'SUGGEST_CATEGORY_REORG':
      return await handleSuggestCategoryReorg(message.payload);

    case 'FETCH_IMAGE_DATA_URL':
      return await handleFetchImageDataUrl(message.url);

    case 'FETCH_INSTAGRAM_CAPTION':
      return await handleFetchInstagramCaption(message.url);

    case 'FETCH_POST_THUMBNAIL':
      return await handleFetchPostThumbnail(message.url);

    case 'INJECT_TIKTOK_HOOK':
      return await handleInjectTikTokHook(sender);

    case 'CAPTURE_POST_PREVIEW':
      return await handleCapturePostPreview(message, sender);

    // Account Management
    case 'GET_USER_ACCOUNTS':
      return await handleGetUserAccounts();

    case 'SAVE_USER_ACCOUNTS':
      return await handleSaveUserAccounts(message.accounts);

    case 'ADD_USER_ACCOUNT':
      return await handleAddUserAccount(message.platform, message.accountInfo);

    case 'UPDATE_USER_ACCOUNT':
      return await handleUpdateUserAccount(message.platform, message.accountId, message.updates);

    case 'REMOVE_USER_ACCOUNT':
      return await handleRemoveUserAccount(message.platform, message.accountId);

    case 'PING':
      return { success: true, message: 'pong' };

    case 'GET_CURRENT_TAB_ID':
      return { success: true, tabId: sender?.tab?.id || null };

    default:
      console.warn('Unknown message type:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

async function handleSuggestCategoryReorg(payload = {}) {
  try {
    await aiCategorizer.init();
    const categoriesWithUsage = await storageManager.getCategoriesWithUsage();
    const result = await aiCategorizer.suggestCategoryReorg({
      action: payload.action,
      categories: payload.categories,
      categoriesWithUsage,
      goal: payload.goal
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error suggesting category reorg:', error);
    return { success: false, error: error.message };
  }
}

async function handleFetchImageDataUrl(url) {
  try {
    if (!url) {
      return { success: false, error: 'Missing URL' };
    }
    const dataUrl = await fetchImageAsDataUrl(url);
    return { success: true, dataUrl };
  } catch (error) {
    console.warn('Failed to fetch image data URL:', error);
    return { success: false, error: error.message };
  }
}

async function handleFetchInstagramCaption(url) {
  try {
    if (!url) {
      return { success: false, error: 'Missing URL' };
    }
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store'
    });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const html = await response.text();
    const caption = extractCaptionFromHtml(html);
    return { success: true, caption: caption || '' };
  } catch (error) {
    console.warn('Failed to fetch Instagram caption:', error);
    return { success: false, error: error.message };
  }
}

async function handleFetchPostThumbnail(url) {
  try {
    if (!url) {
      return { success: false, error: 'Missing URL' };
    }
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store'
    });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const html = await response.text();
    const thumbnailUrl = extractThumbnailFromHtml(html);
    return { success: true, thumbnailUrl: thumbnailUrl || '' };
  } catch (error) {
    console.warn('Failed to fetch post thumbnail:', error);
    return { success: false, error: error.message };
  }
}

async function handleInjectTikTokHook(sender) {
  try {
    const tabId = sender?.tab?.id;
    if (!tabId) {
      return { success: false, error: 'Missing tab id' };
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        if (window.__ctTikTokHookInstalled) return;
        window.__ctTikTokHookInstalled = true;

        const shouldInspectUrl = (url) => {
          if (!url || typeof url !== 'string') return false;
          return url.includes('api/recommend') ||
            url.includes('item_list') ||
            url.includes('feed') ||
            url.includes('aweme') ||
            url.includes('mcs-sg.tiktokv.com') ||
            url.includes('/v1/list') ||
            url.includes('webcast.tiktok.com/webcast/feed');
        };

        const extractItems = (data) => {
          if (!data || typeof data !== 'object') return [];
          const list = data.itemList || data.item_list || data.aweme_list || data.itemListData || data.data?.item_list || data.data?.itemList;
          if (!Array.isArray(list)) return [];
          return list.map(item => {
            const id = item?.id || item?.aweme_id || item?.itemId;
            const desc = item?.desc || item?.description || item?.title;
            const author = item?.author?.uniqueId || item?.author?.unique_id || item?.author?.nickname || item?.author?.authorName || item?.authorName;
            const shareUrl = item?.shareInfo?.share_url || item?.shareInfo?.shareUrl || item?.shareMeta?.share_url || item?.shareMeta?.shareUrl || item?.share_url || item?.shareUrl;
            if (!id || !author) return null;
            return {
              id: String(id),
              author: String(author),
              desc: desc ? String(desc) : '',
              shareUrl: shareUrl ? String(shareUrl) : ''
            };
          }).filter(Boolean);
        };

        const postItems = (items) => {
          if (!Array.isArray(items) || items.length === 0) return;
          window.postMessage({ type: 'CT_TIKTOK_FEED', items }, '*');
          try {
            console.log('ct:tiktok hook posted items', items.slice(0, 2));
          } catch (error) {
            // ignore
          }
        };

        const originalFetch = window.fetch;
        if (typeof originalFetch === 'function') {
          window.fetch = async function (...args) {
            const response = await originalFetch.apply(this, args);
            try {
              const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
              if (shouldInspectUrl(url)) {
                const clone = response.clone();
                const contentType = clone.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                  clone.json().then((data) => postItems(extractItems(data))).catch(() => {});
                } else {
                  clone.text().then((text) => {
                    try {
                      postItems(extractItems(JSON.parse(text)));
                    } catch (error) {
                      // ignore
                    }
                  }).catch(() => {});
                }
              }
            } catch (error) {
              // ignore
            }
            return response;
          };
        }

        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
          this.__ctTikTokUrl = url;
          return originalOpen.call(this, method, url, ...rest);
        };
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (...args) {
          this.addEventListener('load', function () {
            try {
              const url = this.__ctTikTokUrl;
              if (!shouldInspectUrl(url)) return;
              const text = this.responseText;
              if (!text) return;
              postItems(extractItems(JSON.parse(text)));
            } catch (error) {
              // ignore
            }
          });
          return originalSend.apply(this, args);
        };
      }
    });
    return { success: true };
  } catch (error) {
    console.warn('Failed to inject TikTok hook:', error);
    return { success: false, error: error.message };
  }
}

async function handleCapturePostPreview(message, sender) {
  try {
    const hasActiveTab = await chrome.permissions.contains({
      permissions: ['activeTab']
    });
    const hasTabsPermission = await chrome.permissions.contains({
      permissions: ['tabs']
    });
    const hasAllUrls = await chrome.permissions.contains({
      origins: ['<all_urls>']
    });
    if (!hasActiveTab && !hasTabsPermission && !hasAllUrls) {
      return { success: false, error: 'Capture permission not granted' };
    }

    const tab = sender?.tab;
    if (!tab?.windowId) {
      return { success: false, error: 'Missing tab context' };
    }
    const { interactionId, rect, dpr } = message || {};
    if (!interactionId || !rect) {
      return { success: false, error: 'Missing capture data' };
    }

    const dataUrl = await capturePreviewFromTab(tab.windowId, rect, dpr || 1);
    if (!dataUrl) {
      return { success: false, error: 'Capture failed' };
    }

    const existing = await storageManager.getInteractionById(interactionId);
    if (!existing) {
      return { success: false, error: 'Interaction not found' };
    }

    const updatedContent = {
      ...existing.content,
      previewDataUrl: dataUrl,
      previewCachedAt: Date.now()
    };

    await storageManager.updateInteraction(interactionId, { content: updatedContent });
    return { success: true };
  } catch (error) {
    if (!String(error?.message || '').includes('activeTab')) {
      console.warn('Failed to capture preview:', error);
    }
    return { success: false, error: error.message };
  }
}

async function capturePreviewFromTab(windowId, rect, dpr) {
  const screenshotUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: 'jpeg',
    quality: 70
  });
  if (!screenshotUrl) return null;
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') {
    return screenshotUrl;
  }

  try {
    const screenshotBlob = await (await fetch(screenshotUrl)).blob();
    const bitmap = await createImageBitmap(screenshotBlob);

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const safeRect = rect || { x: 0, y: 0, width: bitmap.width / dpr, height: bitmap.height / dpr };
    const sx = clamp(Math.floor(safeRect.x * dpr), 0, bitmap.width - 1);
    const sy = clamp(Math.floor(safeRect.y * dpr), 0, bitmap.height - 1);
    const sw = clamp(Math.floor(safeRect.width * dpr), 1, bitmap.width - sx);
    const sh = clamp(Math.floor(safeRect.height * dpr), 1, bitmap.height - sy);

    if (sw < 2 || sh < 2) return screenshotUrl;

    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / sw);
    const targetW = Math.max(1, Math.round(sw * scale));
    const targetH = Math.max(1, Math.round(sh * scale));

    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
    const buffer = await outBlob.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return `data:${outBlob.type || 'image/jpeg'};base64,${base64}`;
  } catch (error) {
    console.warn('Preview crop failed, using full screenshot:', error);
    return screenshotUrl;
  }
}

/**
 * Save a new interaction
 */
async function handleSaveInteraction(interaction, sender) {
  try {
    // Add tab ID to the interaction so we can notify the tab later
    if (sender?.tab?.id) {
      interaction.tabId = sender.tab.id;
    }

    const settings = await storageManager.getSettings();
    const isImport = !!(interaction.importedFrom || (interaction.interactionType || '').startsWith('imported_'));
    const skipAI = isImport && settings?.skipAIForImports;
    const suppressNotifications = isImport && settings?.suppressImportNotifications;

    const result = await storageManager.saveInteraction(interaction, { skipAI });

    if (result.success && !result.skippedDuplicate) {
      // Show notification
      if (!suppressNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
          title: 'Content Saved',
          message: `Saved from ${interaction.platform}`,
          priority: 0
        });

        console.log('Notification created for saved interaction');
      }

      // Trigger AI processing
      processAIQueue();
    }

    return { success: result.success, skippedDuplicate: result.skippedDuplicate };
  } catch (error) {
    console.error('Error in handleSaveInteraction:', error);
    return { success: false, error: error.message };
  }
}

async function cacheInteractionPreview(interaction) {
  if (!interaction || !interaction.id) return;
  if (interaction.content?.previewDataUrl) return;
  const imageUrl = interaction.content?.imageUrls?.[0];
  if (!imageUrl) return;

  const dataUrl = await fetchImageAsDataUrl(imageUrl);
  if (!dataUrl) return;

  const updatedContent = {
    ...interaction.content,
    previewDataUrl: dataUrl,
    previewCachedAt: Date.now()
  };

  await storageManager.updateInteraction(interaction.id, { content: updatedContent });
}

async function fetchImageAsDataUrl(url) {
  let response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    response = await fetch(withCacheBuster(url), {
      credentials: 'include',
      cache: 'no-store'
    });
  }

  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }

  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const mime = blob.type || 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

function withCacheBuster(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('ct_bust', Date.now().toString());
    return parsed.toString();
  } catch (error) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}ct_bust=${Date.now()}`;
  }
}

function extractCaptionFromHtml(html) {
  if (!html) return '';
  const metaMatch = html.match(/property="og:description" content="([^"]*)"/i)
    || html.match(/name="description" content="([^"]*)"/i);
  if (!metaMatch) return '';

  const decoded = decodeHtmlEntities(metaMatch[1]).trim();
  if (!decoded) return '';

  const quoted = decoded.match(/[“"]([^”"]+)[”"]/);
  if (quoted && quoted[1]) {
    const text = quoted[1].trim();
    if (text) return text;
  }

  const onInstagramMatch = decoded.match(/^(.+?)\s+on\s+instagram\s*[:：]\s*(.+)$/i);
  if (!onInstagramMatch) return '';

  const authorSegment = (onInstagramMatch[1] || '').trim();
  const candidate = (onInstagramMatch[2] || '').trim();
  if (!candidate) return '';

  let authorHandle = authorSegment;
  const handleMatch = authorSegment.match(/@([\w.]+)/);
  if (handleMatch && handleMatch[1]) {
    authorHandle = handleMatch[1];
  }
  authorHandle = authorHandle.replace(/^@/, '').trim();
  const candidateNormalized = candidate.replace(/^@/, '').trim();

  if (authorHandle && candidateNormalized.toLowerCase() === authorHandle.toLowerCase()) {
    return '';
  }

  return candidate;
}

function extractThumbnailFromHtml(html) {
  if (!html) return '';

  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const match of jsonLdMatches) {
    const jsonMatch = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!jsonMatch || !jsonMatch[1]) continue;
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      const candidate = findThumbnailInJsonLd(parsed);
      if (candidate) return candidate;
    } catch (error) {
      continue;
    }
  }

  const ogImageMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImageMatch && ogImageMatch[1]) {
    const decoded = decodeHtmlEntities(ogImageMatch[1]).trim();
    if (decoded && !isLikelyPlaceholderThumbnail(decoded) && !isLikelyProfileImage(decoded)) {
      return decoded;
    }
  }

  const twitterImageMatch = html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (twitterImageMatch && twitterImageMatch[1]) {
    const decoded = decodeHtmlEntities(twitterImageMatch[1]).trim();
    if (decoded && !isLikelyPlaceholderThumbnail(decoded) && !isLikelyProfileImage(decoded)) {
      return decoded;
    }
  }

  return '';
}

function findThumbnailInJsonLd(payload) {
  if (!payload) return '';
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const candidate = findThumbnailInJsonLd(entry);
      if (candidate) return candidate;
    }
    return '';
  }

  if (typeof payload === 'object') {
    const direct = normalizeThumbnailValue(payload.thumbnailUrl || payload.thumbnailURL || payload.thumbnail || payload.image);
    if (direct) return direct;

    if (payload.video && typeof payload.video === 'object') {
      const fromVideo = normalizeThumbnailValue(payload.video.thumbnailUrl || payload.video.thumbnailURL || payload.video.image);
      if (fromVideo) return fromVideo;
    }

    for (const value of Object.values(payload)) {
      const candidate = findThumbnailInJsonLd(value);
      if (candidate) return candidate;
    }
  }

  return '';
}

function normalizeThumbnailValue(value) {
  if (!value) return '';
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = normalizeThumbnailValue(entry);
      if (candidate) return candidate;
    }
    return '';
  }
  if (typeof value === 'string') {
    const decoded = decodeHtmlEntities(value).trim();
    if (!decoded || isLikelyPlaceholderThumbnail(decoded) || isLikelyProfileImage(decoded)) return '';
    return decoded;
  }
  if (typeof value === 'object') {
    const url = value.url || value.contentUrl;
    if (url) {
      const decoded = decodeHtmlEntities(url).trim();
      if (!decoded || isLikelyPlaceholderThumbnail(decoded) || isLikelyProfileImage(decoded)) return '';
      return decoded;
    }
  }
  return '';
}

function isLikelyPlaceholderThumbnail(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes('placeholder') ||
    lower.includes('logo') ||
    lower.includes('sprite') ||
    lower.includes('blank') ||
    lower.includes('default');
}

function isLikelyProfileImage(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes('profile') ||
    lower.includes('avatar') ||
    lower.includes('aweme-avatar') ||
    lower.includes('tiktokcdn.com/aweme') ||
    lower.includes('s150x150') ||
    lower.includes('s320x320');
}
function decodeHtmlEntities(text) {
  if (!text) return '';
  let decoded = text
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");

  decoded = decoded.replace(/&#(\d+);/g, (_match, num) => {
    const code = Number(num);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
  });

  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
  });

  return decoded;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Get interactions with filters
 */
async function handleGetInteractions(filters) {
  try {
    const interactions = await storageManager.getInteractions(filters);
    return { success: true, data: interactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get single interaction by ID
 */
async function handleGetInteractionById(id) {
  try {
    const interaction = await storageManager.getInteractionById(id);
    return { success: true, data: interaction };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get interaction by content key
 */
async function handleGetInteractionByKey(contentKey) {
  try {
    const interaction = await storageManager.getInteractionByKey(contentKey);
    return { success: true, data: interaction };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update interaction
 */
async function handleUpdateInteraction(id, updates) {
  try {
    const success = await storageManager.updateInteraction(id, updates);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete interaction
 */
async function handleDeleteInteraction(id) {
  try {
    const success = await storageManager.deleteInteraction(id);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get settings
 */
async function handleGetSettings() {
  try {
    const settings = await storageManager.getSettings();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update settings
 */
async function handleUpdateSettings(updates) {
  try {
    const success = await storageManager.updateSettings(updates);

    // Reinitialize AI categorizer with new settings
    if (updates.openaiApiKey || updates.geminiApiKey || updates.aiProvider || updates.apiKey) {
      await aiCategorizer.init();
    }

    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get metadata
 */
async function handleGetMetadata() {
  try {
    const metadata = await storageManager.getMetadata();
    return { success: true, data: metadata };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get statistics
 */
async function handleGetStatistics() {
  try {
    const stats = await storageManager.getStatistics();
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all categories
 */
async function handleGetCategories() {
  try {
    const categories = await storageManager.getAllCategories();
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user-defined categories
 */
async function handleGetUserCategories() {
  try {
    const categories = await storageManager.getUserCategories();
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update user-defined categories
 */
async function handleUpdateUserCategories(categories) {
  try {
    const success = await storageManager.saveUserCategories(categories);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Export data
 */
async function handleExportData() {
  try {
    const blob = await storageManager.exportData();
    // Convert blob to base64 for transmission
    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

    return { success: true, data: base64 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process AI queue
 */
async function handleProcessAIQueue() {
  processAIQueue();
  return { success: true };
}

/**
 * Process AI categorization queue (background task)
 */
let isProcessing = false;

async function processAIQueue() {
  // Prevent concurrent processing
  if (isProcessing) {
    console.log('AI queue already being processed');
    return;
  }

  isProcessing = true;

  try {
    // Reinitialize AI categorizer to get latest settings
    await aiCategorizer.init();

    // Get queue
    const queue = await storageManager.getAIQueue();

    if (queue.length === 0) {
      console.log('AI queue is empty');
      return;
    }

    console.log(`Processing AI queue: ${queue.length} items`);

    // Fetch existing categories with usage counts for smarter AI categorization
    const existingCategories = await storageManager.getCategoriesWithUsage();
    console.log(`Loaded ${existingCategories.length} categories for AI context`);

    // Process in batches of 5
    const batchSize = 5;
    const batch = queue.slice(0, batchSize);

    const processedIds = [];

    for (const interactionId of batch) {
      try {
        const interaction = await storageManager.getInteractionById(interactionId);

        // Skip if already processed or not found
        if (!interaction || interaction.aiProcessed) {
          processedIds.push(interactionId);
          continue;
        }

        // Categorize with AI, passing existing categories for context
        console.log(`Categorizing interaction: ${interactionId}`);
        const { categories, failureReason } = await aiCategorizer.categorizeContent(interaction, existingCategories);

        // Update interaction with categories
        await storageManager.updateInteraction(interactionId, {
          categories: categories,
          aiProcessed: true,
          aiFailureReason: failureReason || null, // Store failure reason
        });

        // Notify content script of AI categorization result
        // Note: Save already succeeded, we're just updating with AI results
        try {
          if (interaction.tabId) {
            chrome.tabs.sendMessage(interaction.tabId, {
              type: 'INTERACTION_SAVED_STATUS',
              success: !failureReason,
              saveSuccess: true, // Save was successful (we're just updating AI status)
              interactionType: interaction.interactionType,
              platform: interaction.platform,
              categories: categories, // categories is already an array
              aiProcessed: true,
              aiFailureReason: failureReason || null,
            });
          }
        } catch (tabError) {
          console.warn('Could not notify tab:', tabError);
        }

        processedIds.push(interactionId);
        console.log(`Categorized as: ${categories.join(', ')}`);
      } catch (error) {
        console.error(`Error processing interaction ${interactionId}:`, error);
        // Store failure reason for the interaction
        await storageManager.updateInteraction(interactionId, {
          aiProcessed: false,
          aiFailureReason: error.message,
        });

        // Notify content script of AI categorization failure
        // Note: Save already succeeded, only AI categorization failed
        try {
          if (interaction?.tabId) {
            chrome.tabs.sendMessage(interaction.tabId, {
              type: 'INTERACTION_SAVED_STATUS',
              success: false,
              saveSuccess: true, // Save was successful (only AI failed)
              interactionType: interaction.interactionType,
              platform: interaction.platform,
              categories: ['Uncategorized'],
              aiProcessed: false,
              aiFailureReason: error.message,
            });
          }
        } catch (tabError) {
          console.warn('Could not notify tab of error:', tabError);
        }
        // Continue with next item instead of failing entire batch
      }
    }

    // Remove processed items from queue
    await storageManager.removeFromAIQueue(processedIds);

    // If there are more items, schedule next batch
    const remainingQueue = await storageManager.getAIQueue();
    if (remainingQueue.length > 0) {
      console.log(`Scheduling next batch: ${remainingQueue.length} items remaining`);
      setTimeout(processAIQueue, 2000); // Wait 2 seconds before next batch
    } else {
      console.log('AI queue processing complete');
    }
  } catch (error) {
    console.error('Error processing AI queue:', error);
  } finally {
    isProcessing = false;
  }
}

// Set up periodic AI queue processing (every 5 minutes)
chrome.alarms.create('process-ai-queue', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'process-ai-queue') {
    console.log('Periodic AI queue processing triggered');
    processAIQueue();
  }
});

// Process queue on startup
setTimeout(processAIQueue, 5000); // Wait 5 seconds after startup

console.log('Background service worker initialized');

/**
 * Get user accounts
 */
async function handleGetUserAccounts() {
  try {
    const accounts = await storageManager.getUserAccounts();
    return { success: true, data: accounts };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save user accounts
 */
async function handleSaveUserAccounts(accounts) {
  try {
    const success = await storageManager.saveUserAccounts(accounts);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Add user account
 */
async function handleAddUserAccount(platform, accountInfo) {
  try {
    const success = await storageManager.addUserAccount(platform, accountInfo);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update user account
 */
async function handleUpdateUserAccount(platform, accountId, updates) {
  try {
    const success = await storageManager.updateUserAccount(platform, accountId, updates);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove user account
 */
async function handleRemoveUserAccount(platform, accountId) {
  try {
    const success = await storageManager.removeUserAccount(platform, accountId);
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
