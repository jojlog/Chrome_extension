// Base Tracker - Abstract base class for platform-specific trackers
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
      const interaction = {
        id: ContentExtractor.generatePostId(this.platform, content.url, content.text),
        platform: this.platform,
        interactionType: type,
        timestamp: Date.now(),
        viewDuration: viewDuration,
        content: content,
        metadata: metadata,
        categories: [],
        aiProcessed: false,
        tags: [],
        notes: '',
        isFavorite: false
      };

      // Ensure service worker is active before sending message
      let retries = 3;
      let saveSuccess = false;
      while (retries > 0) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'SAVE_INTERACTION',
            data: interaction
          });
          if (response && response.success) {
            console.log(`${this.platform}: Successfully saved ${type} interaction`);
            saveSuccess = true;
            this.pendingSaves.delete(saveKey); // Clear pending save on success

            // Show immediate success popup (AI categorization pending)
            if (window.statusPopupManager) {
              window.statusPopupManager.show({
                success: true,
                saveSuccess: true, // Save was successful
                interactionType: type,
                platform: this.platform,
                categories: ['Pending...'],
                aiProcessed: false,
                aiFailureReason: null
              });
            }
            return; // Exit on successful save
          } else if (response?.error === 'Extension context invalidated.') {
            console.warn(`${this.platform}: Service worker inactive, retrying...`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
          } else {
            console.error(`${this.platform}: Failed to save interaction:`, response?.error);

            // Show failure popup - save actually failed
            if (window.statusPopupManager) {
              window.statusPopupManager.show({
                success: false,
                saveSuccess: false, // Save failed
                interactionType: type,
                platform: this.platform,
                categories: ['Failed'],
                aiProcessed: false,
                aiFailureReason: response?.error || 'Unknown error'
              });
            }
            break; // Exit on other errors
          }
        } catch (error) {
          if (error.message.includes('Extension context invalidated')) {
            console.warn(`${this.platform}: Service worker inactive, retrying...`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
          } else {
            console.error(`${this.platform}: Error capturing interaction:`, error);

            // Show failure popup
            if (window.statusPopupManager) {
              window.statusPopupManager.show({
                success: false,
                saveSuccess: false,
                interactionType: type,
                platform: this.platform,
                categories: ['Error'],
                aiProcessed: false,
                aiFailureReason: error.message
              });
            }
            break; // Exit on other errors
          }
        }
      }

      // If all retries fail, show failure popup and remove from pending saves
      if (!saveSuccess && window.statusPopupManager) {
        window.statusPopupManager.show({
          success: false,
          saveSuccess: false,
          interactionType: type,
          platform: this.platform,
          categories: ['Connection Failed'],
          aiProcessed: false,
          aiFailureReason: 'Could not connect to extension'
        });
      }
      this.pendingSaves.delete(saveKey);
    } catch (error) {
      console.error(`${this.platform}: Error capturing interaction outside retry block:`, error);

      // Show error popup
      if (window.statusPopupManager) {
        window.statusPopupManager.show({
          success: false,
          saveSuccess: false,
          interactionType: 'interaction',
          platform: this.platform,
          categories: ['Error'],
          aiProcessed: false,
          aiFailureReason: error.message
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
