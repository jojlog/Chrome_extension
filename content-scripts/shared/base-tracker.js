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
      return true;
    });
  }

  async init() {
    await this.waitForPageLoad();
    this.setupMutationObserver();
    this.setupEventListeners();
    this.setupTimeThresholdListener();
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
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.checkForNewPosts(node);
        }
      });
    });
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

      const interaction = {
        id: ContentExtractor.generatePostId(this.platform, content.url, content.text),
        platform: this.platform,
        interactionType: type,
        timestamp: Date.now(),
        viewDuration: viewDuration,
        savedBy: loggedInUser,  // NEW: Track which user account saved this
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
    this.trackedPosts.clear();
    this.pendingSaves.clear();
    console.log(`${this.platform} tracker destroyed`);
  }
}

window.BasePlatformTracker = BasePlatformTracker;
