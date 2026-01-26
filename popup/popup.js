// Popup Script
class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Popup initialized');

    // Load data
    await this.loadStatistics();
    await this.loadRecentItems();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Load statistics
   */
  async loadStatistics() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATISTICS' });

      if (response && response.success) {
        const stats = response.data;

        // Update total stats
        document.getElementById('total-saved').textContent = stats.total || 0;
        document.getElementById('today-saved').textContent = stats.today || 0;
        document.getElementById('week-saved').textContent = stats.thisWeek || 0;

        // Update platform stats
        document.getElementById('instagram-count').textContent = stats.byPlatform.instagram || 0;
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
      const response = await chrome.runtime.sendMessage({ type: 'GET_INTERACTIONS' });

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
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open dashboard button
    document.getElementById('open-dashboard').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html#settings') });
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', async () => {
      await this.loadStatistics();
      await this.loadRecentItems();
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
