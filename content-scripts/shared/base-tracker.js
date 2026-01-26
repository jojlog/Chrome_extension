// Base Tracker - Abstract base class for platform-specific trackers
// Base Tracker - Abstract base class for platform-specific trackers

// NOTE: Cannot use imports in content scripts without build step or type="module" in manifest
// MESSAGE_TYPES is intentionally duplicated here from lib/constants.js because content scripts
// cannot use ES module imports. Keep this in sync with lib/constants.js if adding new types.
const MESSAGE_TYPES = {
  SAVE_INTERACTION: 'SAVE_INTERACTION',
  GET_INTERACTIONS: 'GET_INTERACTIONS',
  GET_INTERACTION_BY_ID: 'GET_INTERACTION_BY_ID',
  UPDATE_INTERACTION: 'UPDATE_INTERACTION',
  DELETE_INTERACTION: 'DELETE_INTERACTION',
  GET_SETTINGS: 'GET_SETTINGS',
  GET_IMPORT_STATUS: 'GET_IMPORT_STATUS',
  TRIGGER_AUTO_IMPORT: 'TRIGGER_AUTO_IMPORT',
  START_AUTO_SCROLL_IMPORT: 'START_AUTO_SCROLL_IMPORT',
  PAUSE_AUTO_SCROLL_IMPORT: 'PAUSE_AUTO_SCROLL_IMPORT',
  RESUME_AUTO_SCROLL_IMPORT: 'RESUME_AUTO_SCROLL_IMPORT',
  STOP_AUTO_SCROLL_IMPORT: 'STOP_AUTO_SCROLL_IMPORT',
  GET_INTERACTION_BY_KEY: 'GET_INTERACTION_BY_KEY',
  PING: 'PING',
  GET_CURRENT_TAB_ID: 'GET_CURRENT_TAB_ID'
};

// NOTE: ContentExtractor is already declared as a class in content-extractor.js
// which runs before this file. Use window.ContentExtractor directly if needed.

class BasePlatformTracker {
  constructor(platformName) {
    this.platform = platformName;
    this.observer = null;
    this.timeTracker = window.timeTracker;
    this.trackedPosts = new Set();
    this.pendingSaves = new Map();
    this.capturedPostIds = new Set(); // Track posts already captured to avoid duplicates
    this.pageMode = null; // 'feed', 'bookmarks', 'likes', 'saved', etc.
    this.settings = null;
    this.bulkCaptureTimeout = null;
    this.autoScrollState = {
      running: false,
      paused: false,
      stopped: false,
      completed: false,
      importedCount: 0,
      startTime: 0,
      lastScrollHeight: 0,
      noGrowthStreak: 0,
      maxItems: 50,
      maxDurationMs: 5 * 60 * 1000,
      stepDelayMs: 1000,
      minNoGrowthChecks: 3,
      stepCount: 0,
      dailyLimit: 200,
      dailyCount: 0,
      microPauseEveryMin: 5,
      microPauseEveryMax: 8
    };
    this.autoScrollOverlay = null;
    this.autoScrollInterruptHandler = null;
    this.savedStatusCache = new Map();
    this.currentIndicator = null;
    this.currentIndicatorPost = null;

    console.log(`${this.platform} tracker initializing...`);
    this.init();
    this.setupMessageListener();
  }

  /**
   * Setup listener for messages from the service worker
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'INTERACTION_SAVED_STATUS') {
        // Show the status popup
        if (window.statusPopupManager) {
          window.statusPopupManager.show({
            success: message.success,
            interactionType: message.interactionType || 'interaction',
            platform: message.platform || this.platform,
            categories: message.categories || ['Uncategorized'],
            aiProcessed: message.aiProcessed,
            aiFailureReason: message.aiFailureReason
          });
        }
        sendResponse({ received: true });
      }
      if (message.type === MESSAGE_TYPES.GET_IMPORT_STATUS) {
        sendResponse({
          success: true,
          data: {
            platform: this.platform,
            pageMode: this.pageMode || 'feed',
            autoImportEnabled: !!this.settings?.autoImportSavedPages,
            autoImportPaused: !!this.settings?.autoImportPaused
          }
        });
      }
      if (message.type === MESSAGE_TYPES.TRIGGER_AUTO_IMPORT) {
        const triggered = this.triggerManualImport();
        sendResponse({ success: true, triggered });
      }
      if (message.type === MESSAGE_TYPES.START_AUTO_SCROLL_IMPORT) {
        const result = this.startAutoScrollImport('popup');
        sendResponse({ success: result.started, reason: result.reason });
      }
      if (message.type === MESSAGE_TYPES.PAUSE_AUTO_SCROLL_IMPORT) {
        this.pauseAutoScrollImport();
        sendResponse({ success: true });
      }
      if (message.type === MESSAGE_TYPES.RESUME_AUTO_SCROLL_IMPORT) {
        this.resumeAutoScrollImport();
        sendResponse({ success: true });
      }
      if (message.type === MESSAGE_TYPES.STOP_AUTO_SCROLL_IMPORT) {
        this.stopAutoScrollImport('stopped');
        sendResponse({ success: true });
      }
      return true;
    });
  }

  async init() {
    await this.waitForPageLoad();

    this.settings = await this.loadSettings();
    this.setupSettingsListener();

    // Detect page mode (saved, bookmarks, likes, etc.)
    this.pageMode = this.detectPageMode();
    console.log(`${this.platform}: Page mode detected: ${this.pageMode || 'feed'}`);

    this.setupUrlChangeObserver();
    this.setupMutationObserver();
    this.setupEventListeners();
    this.setupTimeThresholdListener();

    // If on a saved/liked page, trigger bulk capture after a short delay
    if (this.shouldAutoImport()) {
      setTimeout(() => this.bulkCaptureVisiblePosts(), 1500);
    }

    console.log(`${this.platform} tracker initialized`);
  }

  async waitForPageLoad() {
    if (document.readyState === 'complete') return;
    return new Promise(resolve => {
      window.addEventListener('load', resolve, { once: true });
      setTimeout(resolve, 3000);
    });
  }

  setupMutationObserver() {
    this.observer = new MutationObserver(
      ContentExtractor.debounce((mutations) => {
        this.handleMutations(mutations);
      }, 500)
    );
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleMutations(mutations) {
    let shouldScheduleImport = false;
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.checkForNewPosts(node);
          shouldScheduleImport = true;
        }
      });
    });
    if (shouldScheduleImport) {
      this.scheduleBulkCapture();
    }
  }

  checkForNewPosts(node) {
    const selectors = this.getPostContainerSelectors();
    if (!selectors || selectors.length === 0) return;
    for (const selector of selectors) {
      if (node.matches && node.matches(selector)) {
        this.handleNewPost(node);
      }
    }
    const posts = ContentExtractor.findAllWithFallback(node, selectors);
    posts.forEach(post => this.handleNewPost(post));
  }

  scanExistingPosts() {
    const selectors = this.getPostContainerSelectors();
    if (!selectors || selectors.length === 0) {
      console.warn(`${this.platform}: No post container selectors defined`);
      return;
    }
    const posts = ContentExtractor.findAllWithFallback(document, selectors);
    console.log(`${this.platform}: Found ${posts.length} existing posts`);
    posts.forEach(post => this.handleNewPost(post));
  }

  handleNewPost(postElement) {
    const postId = this.generatePostId(postElement);
    if (this.trackedPosts.has(postId)) return;
    this.trackedPosts.add(postId);
    if (this.timeTracker) {
      this.timeTracker.observePost(postElement, postId);
    }
    postElement.dataset.postId = postId;
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      this.handleClick(e);
    }, true);
  }

  handleClick(event) {
    const target = event.target;
    if (this.isLikeButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && !this.isAlreadyLiked(target)) {
        this.captureInteraction('like', postElement);
      }
    }
    if (this.isSaveButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement && !this.isAlreadySaved(target)) {
        this.captureInteraction('save', postElement);
      }
    }
    if (this.isRetweetButton(target)) {
      const postElement = this.findPostElement(target);
      if (postElement) {
        this.captureInteraction('retweet', postElement);
      }
    }
  }

  setupTimeThresholdListener() {
    window.addEventListener('time-threshold-reached', (event) => {
      const { postElement, postId, duration } = event.detail;
      console.log(`${this.platform}: Time threshold reached for post ${postId}`);
    });

    window.addEventListener('ct-post-active', (event) => {
      if (this.platform !== 'twitter') return;
      const { postElement } = event.detail || {};
      if (!postElement) return;
      this.showSavedIndicatorForPost(postElement);
    });

    window.addEventListener('ct-post-inactive', (event) => {
      if (this.platform !== 'twitter') return;
      const { postElement } = event.detail || {};
      if (!postElement) return;
      if (postElement === this.currentIndicatorPost) {
        this.removeSavedIndicator();
      }
    });
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS });
      if (response && response.success) {
        return response.data;
      }
    } catch (error) {
      console.warn(`${this.platform}: Failed to load settings`, error);
    }
    return {
      autoImportSavedPages: false,
      autoImportPaused: false,
      suppressImportNotifications: true,
      skipAIForImports: true
    };
  }

  shouldAutoImport() {
    return !!(
      this.pageMode &&
      this.pageMode !== 'feed' &&
      this.settings &&
      this.settings.autoImportSavedPages &&
      !this.settings.autoImportPaused
    );
  }

  setupSettingsListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.settings) return;
      const newSettings = changes.settings.newValue;
      if (newSettings) {
        this.settings = newSettings;
      }

      if (!this.shouldAutoImport()) {
        this.cancelBulkCapture();
        return;
      }

      if (this.pageMode && this.pageMode !== 'feed') {
        this.scheduleBulkCapture();
      }
    });
  }

  cancelBulkCapture() {
    if (this.bulkCaptureTimeout) {
      clearTimeout(this.bulkCaptureTimeout);
      this.bulkCaptureTimeout = null;
    }
  }

  setupUrlChangeObserver() {
    if (!window.__ctUrlObserverInstalled) {
      const notify = () => window.dispatchEvent(new Event('ct:urlchange'));
      const wrap = (method) => {
        const original = history[method];
        if (!original) return;
        history[method] = function (...args) {
          const result = original.apply(this, args);
          notify();
          return result;
        };
      };
      wrap('pushState');
      wrap('replaceState');
      window.addEventListener('popstate', notify);
      window.__ctUrlObserverInstalled = true;
    }

    window.addEventListener('ct:urlchange', () => {
      this.handleUrlChange();
    });
  }

  handleUrlChange() {
    const newMode = this.detectPageMode();
    if (newMode === this.pageMode) return;

    this.pageMode = newMode;
    this.capturedPostIds.clear();
    console.log(`${this.platform}: Page mode changed: ${this.pageMode || 'feed'}`);

    if (this.shouldAutoImport()) {
      setTimeout(() => this.bulkCaptureVisiblePosts(), 800);
      return;
    }

    this.cancelBulkCapture();
  }

  scheduleBulkCapture() {
    if (!this.shouldAutoImport()) return;
    if (this.bulkCaptureTimeout) {
      clearTimeout(this.bulkCaptureTimeout);
    }
    this.bulkCaptureTimeout = setTimeout(() => {
      this.bulkCaptureVisiblePosts();
    }, 800);
  }

  triggerManualImport() {
    if (!this.pageMode || this.pageMode === 'feed') {
      return false;
    }
    if (!this.settings?.autoImportSavedPages || this.settings?.autoImportPaused) {
      return false;
    }
    this.scheduleBulkCapture();
    return true;
  }

  startAutoScrollImport(origin = 'overlay') {
    if (!this.pageMode || this.pageMode === 'feed') {
      this.ensureAutoScrollOverlay();
      this.updateAutoScrollOverlay('Stopped', 'Open a saved/liked page to start auto-scroll.', true);
      return { started: false, reason: 'not_saved_page' };
    }

    if (this.autoScrollState.running && !this.autoScrollState.paused) {
      return { started: false, reason: 'already_running' };
    }

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
    this.updateAutoScrollOverlay('Running', 'Auto-scroll import started.');

    this.bindAutoScrollInterrupts();
    this.runAutoScrollLoop();
    return { started: true };
  }

  pauseAutoScrollImport(message = 'Auto-scroll import paused.') {
    if (!this.autoScrollState.running) return;
    this.autoScrollState.paused = true;
    this.updateAutoScrollOverlay('Paused', message);
  }

  resumeAutoScrollImport() {
    if (!this.autoScrollState.running) return;
    this.autoScrollState.paused = false;
    this.updateAutoScrollOverlay('Running', 'Auto-scroll import resumed.');
  }

  stopAutoScrollImport(reason = 'stopped') {
    if (!this.autoScrollState.running) return;
    this.autoScrollState.running = false;
    this.autoScrollState.paused = false;
    this.autoScrollState.stopped = reason === 'stopped';
    this.autoScrollState.completed = reason === 'completed';
    this.unbindAutoScrollInterrupts();

    const statusLabel = this.autoScrollState.completed ? 'Completed' : 'Stopped';
    const hint = this.autoScrollState.completed ?
      'Auto-scroll import completed.' :
      'Auto-scroll import stopped.';
    this.updateAutoScrollOverlay(statusLabel, hint, true);
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

      const beforeHeight = this.getScrollHeight();
      const stepRatio = this.randomBetween(0.45, 0.85);
      const stepSize = Math.max(200, Math.floor(window.innerHeight * stepRatio));
      window.scrollBy(0, stepSize);

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

      const afterHeight = this.getScrollHeight();
      if (afterHeight <= beforeHeight + 10) {
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

  shouldMicroPause() {
    const rangeMin = this.autoScrollState.microPauseEveryMin;
    const rangeMax = this.autoScrollState.microPauseEveryMax;
    const target = this.randomInt(rangeMin, rangeMax);
    return this.autoScrollState.stepCount > 0 && this.autoScrollState.stepCount % target === 0;
  }

  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  bindAutoScrollInterrupts() {
    if (this.autoScrollInterruptHandler) return;
    this.autoScrollInterruptHandler = () => {
      if (this.autoScrollState.running && !this.autoScrollState.paused) {
        this.pauseAutoScrollImport('User activity detected. Auto-scroll paused.');
      }
    };
    window.addEventListener('wheel', this.autoScrollInterruptHandler, { passive: true });
    window.addEventListener('mousedown', this.autoScrollInterruptHandler, { passive: true });
    window.addEventListener('keydown', this.autoScrollInterruptHandler);
    window.addEventListener('touchstart', this.autoScrollInterruptHandler, { passive: true });
    document.addEventListener('visibilitychange', this.autoScrollInterruptHandler);
  }

  unbindAutoScrollInterrupts() {
    if (!this.autoScrollInterruptHandler) return;
    window.removeEventListener('wheel', this.autoScrollInterruptHandler);
    window.removeEventListener('mousedown', this.autoScrollInterruptHandler);
    window.removeEventListener('keydown', this.autoScrollInterruptHandler);
    window.removeEventListener('touchstart', this.autoScrollInterruptHandler);
    document.removeEventListener('visibilitychange', this.autoScrollInterruptHandler);
    this.autoScrollInterruptHandler = null;
  }

  async getDailyAutoScrollCount() {
    const today = new Date().toISOString().slice(0, 10);
    return new Promise((resolve) => {
      chrome.storage.local.get('autoScrollDailyCount', (result) => {
        const record = result.autoScrollDailyCount;
        if (!record || record.date !== today) {
          resolve(0);
          return;
        }
        resolve(record.count || 0);
      });
    });
  }

  async incrementDailyAutoScrollCount(delta) {
    const today = new Date().toISOString().slice(0, 10);
    return new Promise((resolve) => {
      chrome.storage.local.get('autoScrollDailyCount', (result) => {
        const record = result.autoScrollDailyCount;
        const current = record && record.date === today ? record.count || 0 : 0;
        chrome.storage.local.set({
          autoScrollDailyCount: {
            date: today,
            count: current + delta
          }
        }, () => resolve());
      });
    });
  }

  getScrollHeight() {
    return Math.max(
      document.documentElement.scrollHeight || 0,
      document.body?.scrollHeight || 0
    );
  }

  ensureAutoScrollOverlay() {
    if (this.autoScrollOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'ct-auto-scroll-overlay';
    overlay.className = 'ct-auto-scroll-overlay';
    overlay.innerHTML = `
      <div class="ct-auto-scroll-header">
        <div>
          <div class="ct-auto-scroll-title">Auto-Scroll Import</div>
          <div class="ct-auto-scroll-status">
            <span class="ct-auto-scroll-pill ct-auto-scroll-pill--running">Running</span>
          </div>
        </div>
        <button class="ct-auto-scroll-close" data-action="close" aria-label="Close">×</button>
      </div>
      <div class="ct-auto-scroll-body">
        <div class="ct-auto-scroll-count">Imported 0 items</div>
        <div class="ct-auto-scroll-hint">Saved/Liked page</div>
      </div>
      <div class="ct-auto-scroll-actions">
        <button class="ct-auto-scroll-btn" data-action="pause">Pause</button>
        <button class="ct-auto-scroll-btn" data-action="resume">Resume</button>
        <button class="ct-auto-scroll-btn ct-auto-scroll-btn--danger" data-action="stop">Stop</button>
      </div>
    `;

    overlay.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute('data-action');
      if (!action) return;

      switch (action) {
        case 'pause':
          this.pauseAutoScrollImport();
          break;
        case 'resume':
          this.resumeAutoScrollImport();
          break;
        case 'stop':
          this.stopAutoScrollImport('stopped');
          break;
        case 'close':
          overlay.remove();
          this.autoScrollOverlay = null;
          break;
        default:
          break;
      }
    });

    document.body.appendChild(overlay);
    this.autoScrollOverlay = overlay;
    this.updateAutoScrollOverlay('Running', 'Auto-scroll ready.');
  }

  updateAutoScrollOverlay(statusLabel, hint, stopped = false) {
    if (!this.autoScrollOverlay) return;
    const statusEl = this.autoScrollOverlay.querySelector('.ct-auto-scroll-pill');
    const countEl = this.autoScrollOverlay.querySelector('.ct-auto-scroll-count');
    const hintEl = this.autoScrollOverlay.querySelector('.ct-auto-scroll-hint');
    const pauseBtn = this.autoScrollOverlay.querySelector('[data-action="pause"]');
    const resumeBtn = this.autoScrollOverlay.querySelector('[data-action="resume"]');
    const stopBtn = this.autoScrollOverlay.querySelector('[data-action="stop"]');

    if (statusEl) {
      const statusKey = statusLabel.toLowerCase();
      statusEl.textContent = statusLabel;
      statusEl.className = `ct-auto-scroll-pill ct-auto-scroll-pill--${statusKey}`;
    }

    if (countEl) {
      countEl.textContent = `Imported ${this.autoScrollState.importedCount} items`;
    }

    if (hintEl && hint) {
      hintEl.textContent = hint;
    }

    if (pauseBtn && resumeBtn) {
      const isPaused = this.autoScrollState.paused;
      pauseBtn.toggleAttribute('disabled', isPaused || stopped);
      resumeBtn.toggleAttribute('disabled', !isPaused || stopped);
    }

    if (stopBtn) {
      stopBtn.toggleAttribute('disabled', stopped);
    }
  }

  async showSavedIndicatorForPost(postElement) {
    if (!postElement || this.platform !== 'twitter') return;

    if (this.currentIndicatorPost === postElement) {
      return;
    }

    this.removeSavedIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'ct-saved-indicator ct-saved-indicator--loading';
    indicator.textContent = 'Checking...';

    const computed = window.getComputedStyle(postElement);
    if (computed.position === 'static') {
      postElement.dataset.ctOriginalPosition = 'static';
      postElement.style.position = 'relative';
    }

    postElement.appendChild(indicator);
    this.currentIndicator = indicator;
    this.currentIndicatorPost = postElement;

    const isSaved = await this.isPostSaved(postElement);
    if (this.currentIndicator !== indicator) return;

    indicator.classList.remove('ct-saved-indicator--loading');
    indicator.classList.add(isSaved ? 'ct-saved-indicator--saved' : 'ct-saved-indicator--unsaved');
    indicator.textContent = isSaved ? 'Saved' : 'Not saved';
  }

  removeSavedIndicator() {
    if (this.currentIndicator && this.currentIndicator.parentElement) {
      this.currentIndicator.parentElement.removeChild(this.currentIndicator);
    }
    if (this.currentIndicatorPost && this.currentIndicatorPost.dataset.ctOriginalPosition === 'static') {
      this.currentIndicatorPost.style.position = '';
      delete this.currentIndicatorPost.dataset.ctOriginalPosition;
    }
    this.currentIndicator = null;
    this.currentIndicatorPost = null;
  }

  async isPostSaved(postElement) {
    const content = this.extractContent(postElement);
    const contentKey = ContentExtractor.createContentKey(this.platform, content.url, content.text);

    if (this.savedStatusCache.has(contentKey)) {
      return this.savedStatusCache.get(contentKey);
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_INTERACTION_BY_KEY,
        contentKey
      });

      const saved = !!(response && response.success && response.data);
      this.savedStatusCache.set(contentKey, saved);
      return saved;
    } catch (error) {
      console.warn(`${this.platform}: Failed to check saved status`, error);
      return false;
    }
  }

  async captureInteraction(type, postElement) {
    try {
      const postId = postElement.dataset.postId || this.generatePostId(postElement);
      const saveKey = `${postId}_${type}`;
      if (this.pendingSaves.has(saveKey)) {
        console.log(`${this.platform}: Already saving ${type} for post ${postId}`);
        return;
      }
      this.pendingSaves.set(saveKey, true);
      console.log(`${this.platform}: Capturing ${type} interaction`);
      const content = this.extractContent(postElement);
      const metadata = this.extractMetadata(postElement);
      const viewDuration = this.timeTracker ? this.timeTracker.getDuration(postId) : 0;
      // Get logged-in user info
      const loggedInUser = this.extractLoggedInUser();
      const contentKey = ContentExtractor.createContentKey(this.platform, content.url, content.text);

      const interaction = {
        id: ContentExtractor.generatePostId(this.platform, content.url, content.text),
        platform: this.platform,
        interactionType: type,
        timestamp: Date.now(),
        viewDuration: viewDuration,
        savedBy: loggedInUser,  // NEW: Track which user account saved this
        contentKey: contentKey,
        content: content,
        metadata: metadata,
        categories: [],
        aiProcessed: false,
        tags: [],
        notes: '',
        isFavorite: false
      };

      // Ensure service worker is active before sending message
      let saveSuccess = false;
      const MAX_RETRIES = 3;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.SAVE_INTERACTION,
            data: interaction
          });

          if (response && response.success) {
            console.log(`${this.platform}: Successfully saved ${type} interaction`);
            saveSuccess = true;
            this.pendingSaves.delete(saveKey);

            if (response.skippedDuplicate) {
              console.log(`${this.platform}: Skipped duplicate ${type} interaction`);
              return;
            }

            // Show immediate success popup
            if (window.statusPopupManager) {
              window.statusPopupManager.show({
                success: true,
                saveSuccess: true,
                interactionType: type,
                platform: this.platform,
                categories: ['Pending...'],
                aiProcessed: false
              });
            }
            return; // Success!
          }

          if (attempt < MAX_RETRIES) {
            // Wait before retry if context invalidated or other error
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }

          throw new Error(response?.error || 'Unknown error');

        } catch (error) {
          if (attempt === MAX_RETRIES) {
            throw error; // Throw on final failure
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      this.pendingSaves.delete(saveKey);
    } catch (error) {
      console.error(`${this.platform}: Error capturing interaction outside retry block:`, error);

      // Determine user-friendly error message
      let errorMessage = error.message;
      if (error.message.includes('Extension context invalidated')) {
        errorMessage = 'Extension was updated. Please refresh the page.';
      }

      // Show error popup with correct interaction type
      if (window.statusPopupManager) {
        window.statusPopupManager.show({
          success: false,
          saveSuccess: false,
          interactionType: type,
          platform: this.platform,
          categories: ['Error'],
          aiProcessed: false,
          aiFailureReason: errorMessage
        });
      }
    }
  }

  findPostElement(element) {
    const selectors = this.getPostContainerSelectors();
    if (!selectors || selectors.length === 0) return null;
    for (const selector of selectors) {
      const post = element.closest(selector);
      if (post) return post;
    }
    return null;
  }

  generatePostId(postElement) {
    if (postElement.dataset.postId) {
      return postElement.dataset.postId;
    }
    const text = ContentExtractor.extractText(postElement).substring(0, 50);
    const index = Array.from(postElement.parentNode?.children || []).indexOf(postElement);
    return ContentExtractor.generatePostId(this.platform, window.location.href, `${text}_${index}`);
  }

  /**
   * Get current tab ID - needed for sending messages back to specific tab
   * @returns {Promise<number>} The ID of the current tab
   */
  async getCurrentTabId() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_ID' }, (response) => {
        if (response && response.success) {
          resolve(response.tabId);
        } else {
          console.error('Failed to get current tab ID from background:', response?.error);
          resolve(null);
        }
      });
    });
  }

  getPostContainerSelectors() {
    throw new Error(`${this.platform}: getPostContainerSelectors() must be implemented`);
  }

  /**
   * Extract the currently logged-in user info
   * @returns {Object|null} User info object with username, fullName (optional), id (optional)
   */
  extractLoggedInUser() {
    // Default implementation - subclasses should override with platform-specific logic
    return null;
  }

  /**
   * Detect the current page mode (feed, bookmarks, likes, saved, etc.)
   * @returns {string|null} Page mode or null for regular feed
   */
  detectPageMode() {
    // Default implementation - subclasses should override with platform-specific logic
    return null;
  }

  /**
   * Get the interaction type for the current page mode
   * @returns {string} Interaction type (imported_bookmark, imported_like, imported_save)
   */
  getInteractionTypeForPageMode() {
    const modeMap = {
      'bookmarks': 'imported_bookmark',
      'likes': 'imported_like',
      'saved': 'imported_save',
      'favorites': 'imported_save'
    };
    return modeMap[this.pageMode] || 'imported_save';
  }

  /**
   * Bulk capture all visible posts on saved/liked pages
   */
  async bulkCaptureVisiblePosts(options = {}) {
    const force = options.force === true;
    const suppressSummary = options.suppressSummary === true;
    if (!force && !this.shouldAutoImport()) return 0;
    this.cancelBulkCapture();

    console.log(`${this.platform}: Bulk capturing visible posts from ${this.pageMode} page`);

    const selectors = this.getPostContainerSelectors();
    if (!selectors || selectors.length === 0) return 0;

    const posts = ContentExtractor.findAllWithFallback(document, selectors);
    console.log(`${this.platform}: Found ${posts.length} posts to potentially capture`);

    let capturedCount = 0;
    const interactionType = this.getInteractionTypeForPageMode();

    for (const post of posts) {
      try {
        if (!this.isElementVisible(post)) continue;
        const postId = this.generatePostId(post);

        // Skip if already captured
        if (this.capturedPostIds.has(postId)) continue;
        this.capturedPostIds.add(postId);

        // Capture the post
        const saved = await this.captureImportedInteraction(interactionType, post);
        if (saved) {
          capturedCount++;
        }

        // Small delay to avoid overwhelming the storage
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`${this.platform}: Error capturing post:`, error);
      }
    }

    if (capturedCount > 0 && !suppressSummary && !this.settings?.suppressImportNotifications) {
      console.log(`${this.platform}: Captured ${capturedCount} posts from ${this.pageMode} page`);

      // Show summary notification
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

    return capturedCount;
  }

  /**
   * Capture an imported interaction (from saved/liked page)
   * @param {string} type - Interaction type
   * @param {HTMLElement} postElement - Post element
   */
  async captureImportedInteraction(type, postElement) {
    const content = this.extractContent(postElement);
    const metadata = this.extractMetadata(postElement);
    const loggedInUser = this.extractLoggedInUser();
    const contentKey = ContentExtractor.createContentKey(this.platform, content.url, content.text);

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
      importedFrom: this.pageMode // Track where it was imported from
    };

    // Send to service worker
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SAVE_INTERACTION,
        data: interaction
      });

      if (response && response.success && !response.skippedDuplicate) {
        console.log(`${this.platform}: Imported ${type} interaction`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`${this.platform}: Error saving imported interaction:`, error);
      return false;
    }
  }

  isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > 0 && rect.top < viewportHeight;
  }


  isLikeButton(element) {
    throw new Error(`${this.platform}: isLikeButton() must be implemented`);
  }

  isSaveButton(element) {
    throw new Error(`${this.platform}: isSaveButton() must be implemented`);
  }

  isRetweetButton(element) {
    throw new Error(`${this.platform}: isRetweetButton() must be implemented`);
  }

  isAlreadyLiked(element) {
    return false;
  }

  isAlreadySaved(element) {
    return false;
  }

  extractContent(postElement) {
    throw new Error(`${this.platform}: extractContent() must be implemented`);
  }

  extractMetadata(postElement) {
    throw new Error(`${this.platform}: extractMetadata() must be implemented`);
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.bulkCaptureTimeout) {
      clearTimeout(this.bulkCaptureTimeout);
      this.bulkCaptureTimeout = null;
    }
    this.trackedPosts.clear();
    this.pendingSaves.clear();
    console.log(`${this.platform} tracker destroyed`);
  }
}

window.BasePlatformTracker = BasePlatformTracker;
