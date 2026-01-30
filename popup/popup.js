// Popup Script
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return 'Just now';
  }

  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

class PopupManager {
  constructor() {
    this.currentSettings = null;
    this.importStatus = null;
    this.init();
  }

  async init() {
    console.log('Popup initialized');

    // Setup event listeners
    this.setupEventListeners();

    // Load data
    try {
      await this.safeLoad();
    } catch (error) {
      console.error('Popup load failed:', error);
    }
  }

  async safeLoad() {
    await Promise.all([
      this.loadStatistics(),
      this.loadRecentItems(),
      this.loadImportStatus()
    ]);
  }

  /**
   * Load statistics
   */
  async loadStatistics() {
    try {
      const response = await this.sendRuntimeMessage({ type: 'GET_STATISTICS' });

      if (response && response.success) {
        const stats = response.data;

        // Update total stats
        document.getElementById('total-saved').textContent = stats.total || 0;
        document.getElementById('today-saved').textContent = stats.today || 0;
        document.getElementById('week-saved').textContent = stats.thisWeek || 0;

        // Update platform stats
        document.getElementById('instagram-count').textContent = stats.byPlatform.instagram || 0;
        document.getElementById('threads-count').textContent = stats.byPlatform.threads || 0;
        document.getElementById('twitter-count').textContent = stats.byPlatform.twitter || 0;
        document.getElementById('linkedin-count').textContent = stats.byPlatform.linkedin || 0;
        document.getElementById('tiktok-count').textContent = stats.byPlatform.tiktok || 0;
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  /**
   * Load recent items
   */
  async loadRecentItems() {
    try {
      const response = await this.sendRuntimeMessage({ type: 'GET_INTERACTIONS' });

      if (response && response.success) {
        const interactions = response.data;

        // Get the 5 most recent items
        const recent = interactions.slice(0, 5);

        this.renderRecentItems(recent);
      }
    } catch (error) {
      console.error('Error loading recent items:', error);
      this.renderEmptyState();
    }
  }

  async loadImportStatus() {
    const statusPill = document.getElementById('import-status');
    const statusText = statusPill?.querySelector('.status-text');
    const contextText = document.getElementById('import-context');
    const toggleButton = document.getElementById('import-toggle');
    if (!statusPill || !statusText || !contextText || !toggleButton) {
      return;
    }

    const settings = await this.getSettings();
    this.currentSettings = settings;

    const tab = await this.getActiveTab();
    let pageMode = null;
    let supported = false;

    if (tab?.id) {
      try {
        const response = await this.sendTabMessage(tab.id, { type: 'GET_IMPORT_STATUS' });
        if (response && response.success) {
          supported = true;
          pageMode = response.data?.pageMode || null;
        }
      } catch (error) {
        supported = this.isSupportedUrl(tab?.url);
      }
    }

    const autoImportEnabled = !!settings?.autoImportSavedPages;
    const autoImportPaused = !!settings?.autoImportPaused;
    const autoScrollButton = document.getElementById('auto-scroll-start');

    let statusLabel = 'Off';
    let statusClass = 'status--off';
    let context = 'Auto-import is off. Enable it to capture saved/liked pages.';
    let buttonLabel = 'Enable Auto-Import';

    if (autoImportEnabled && autoImportPaused) {
      statusLabel = 'Paused';
      statusClass = 'status--paused';
      context = 'Paused across all tabs. Resume when ready.';
      buttonLabel = 'Resume Auto-Import';
    } else if (autoImportEnabled && !autoImportPaused) {
      statusLabel = 'Active';
      statusClass = 'status--active';
      context = 'Auto-import is ready. Visit saved/liked pages to capture.';
      buttonLabel = 'Pause Auto-Import';
    }

    if (!supported) {
      if (autoImportEnabled && !autoImportPaused) {
        context = 'Open Instagram, Threads, X, LinkedIn, or TikTok to import saved content.';
      } else if (!autoImportEnabled) {
        context = 'Open a supported site to see auto-import status.';
      }
    } else if (pageMode && pageMode !== 'feed') {
      const label = pageMode.replace('_', ' ');
      context = `Saved page detected: ${label}.`;
    }

    statusPill.className = `status-pill ${statusClass}`;
    statusText.textContent = statusLabel;
    contextText.textContent = context;
    toggleButton.textContent = buttonLabel;
    toggleButton.disabled = false;
    if (autoScrollButton) {
      // Enable when we're on a supported site even if pageMode isn't detected yet.
      autoScrollButton.disabled = !supported;
    }
  }

  async toggleImportStatus() {
    const button = document.getElementById('import-toggle');
    if (button) button.disabled = true;

    const settings = this.currentSettings || await this.getSettings();
    if (!settings) {
      if (button) button.disabled = false;
      return;
    }

    const updates = {};
    if (!settings.autoImportSavedPages) {
      updates.autoImportSavedPages = true;
      updates.autoImportPaused = false;
    } else {
      updates.autoImportPaused = !settings.autoImportPaused;
    }

    await this.sendRuntimeMessage({ type: 'UPDATE_SETTINGS', updates });
    await this.loadImportStatus();
    await this.triggerImportIfActive();
  }

  async getSettings() {
    try {
      const response = await this.sendRuntimeMessage({ type: 'GET_SETTINGS' });
      if (response && response.success) {
        return response.data;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return null;
  }

  async getActiveTab() {
    try {
      if (!chrome?.tabs?.query) {
        return null;
      }
      const tabs = await this.queryTabs({ active: true, currentWindow: true });
      return tabs[0] || null;
    } catch (error) {
      console.error('Error querying active tab:', error);
      return null;
    }
  }

  isSupportedUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\\./, '');
      return [
        'instagram.com',
        'threads.net',
        'threads.com',
        'x.com',
        'twitter.com',
        'linkedin.com',
        'tiktok.com'
      ].includes(host);
    } catch (error) {
      return false;
    }
  }

  sendRuntimeMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Runtime message error:', chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response);
      });
    });
  }

  sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  queryTabs(queryInfo) {
    return new Promise((resolve, reject) => {
      if (!chrome?.tabs?.query) {
        resolve([]);
        return;
      }
      chrome.tabs.query(queryInfo, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(tabs || []);
      });
    });
  }

  openTab(url) {
    if (!url) return;
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url }, () => {
        if (chrome.runtime.lastError) {
          window.open(url, '_blank');
        }
      });
      return;
    }
    window.open(url, '_blank');
  }

  async triggerImportIfActive() {
    const tab = await this.getActiveTab();
    if (!tab?.id) return;
    try {
      await this.sendTabMessage(tab.id, { type: 'TRIGGER_AUTO_IMPORT' });
    } catch (error) {
      // Ignore if content script isn't available.
    }
  }

  /**
   * Render recent items
   */
  renderRecentItems(items) {
    const listElement = document.getElementById('recent-list');

    if (!items || items.length === 0) {
      this.renderEmptyState();
      return;
    }

    listElement.innerHTML = '';

    items.forEach(item => {
      const itemElement = this.createItemElement(item);
      listElement.appendChild(itemElement);
    });
  }

  /**
   * Create item element
   */
  createItemElement(item) {
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.dataset.id = item.id;

    const header = document.createElement('div');
    header.className = 'recent-item-header';

    const badge = document.createElement('span');
    badge.className = `platform-badge ${item.platform}`;
    badge.textContent = item.platform;

    const date = document.createElement('span');
    date.className = 'recent-item-date';
    date.textContent = this.formatDate(item.timestamp);

    header.appendChild(badge);
    header.appendChild(date);

    const content = document.createElement('div');
    content.className = 'recent-item-content';
    content.textContent = item.content.text || 'No text content';

    const meta = document.createElement('div');
    meta.className = 'recent-item-meta';
    meta.textContent = `${item.metadata.author}`;
    if (item.categories && item.categories.length > 0) {
      meta.textContent += ` • ${item.categories.join(', ')}`;
    }

    div.appendChild(header);
    div.appendChild(content);
    div.appendChild(meta);

    // Click to open URL
    div.addEventListener('click', () => {
      if (item.content.url) {
        chrome.tabs.create({ url: item.content.url });
      }
    });

    return div;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const listElement = document.getElementById('recent-list');
    listElement.innerHTML = '<div class="empty-state">No saved content yet.<br>Start browsing social media!</div>';
  }

  /**
   * Format date/time
   */
  formatDate(timestamp) {
    return formatDate(timestamp);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open dashboard button
    document.getElementById('open-dashboard')?.addEventListener('click', () => {
      this.openTab(chrome.runtime.getURL('dashboard/dashboard.html'));
    });

    // Settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.openTab(chrome.runtime.getURL('dashboard/dashboard.html#settings'));
    });

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', async () => {
      await this.safeLoad();
    });

    // Auto-import toggle button
    document.getElementById('import-toggle')?.addEventListener('click', async () => {
      await this.toggleImportStatus();
    });

    document.getElementById('auto-scroll-start')?.addEventListener('click', async () => {
      await this.startAutoScrollImport();
    });
  }

  async startAutoScrollImport() {
    const tab = await this.getActiveTab();
    if (!tab?.id) return;
    try {
      const response = await this.sendTabMessage(tab.id, { type: 'START_AUTO_SCROLL_IMPORT' });
      if (response && response.success) {
        const context = document.getElementById('import-context');
        if (context) {
          context.textContent = 'Auto-scroll import started.';
        }
      } else {
        const context = document.getElementById('import-context');
        if (context) {
          context.textContent = 'Open a saved/liked page to start auto-scroll.';
        }
      }
    } catch (error) {
      const context = document.getElementById('import-context');
      if (context) {
        context.textContent = 'Auto-scroll is unavailable on this page.';
      }
    }
  }
}

// Initialize popup when DOM is ready
const initializePopup = () => {
  new PopupManager();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
