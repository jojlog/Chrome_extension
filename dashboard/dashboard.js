import { StorageManager } from '../lib/storage-manager.js';
import { ContentRenderer } from './modules/content-renderer.js';
import { FiltersManager } from './modules/filters-manager.js';
import { ModalsManager } from './modules/modals-manager.js';
import { AccountsManager } from './modules/accounts-manager.js';

// Dashboard Manager
class DashboardManager {
  constructor() {
    this.storage = new StorageManager();
    this.contentRenderer = new ContentRenderer(this);
    this.filtersManager = new FiltersManager();
    this.modalsManager = new ModalsManager(this);
    this.accountsManager = new AccountsManager(this);

    this.currentFilters = {
      platform: 'all',
      category: 'all',
      search: '',
      sort: 'date-desc'
    };
    this.viewMode = 'grid';
    this.allItems = [];
    this.userCategories = [];
    this.userAccounts = {};

    this.init();
  }

  async init() {
    console.log('Dashboard initializing...');

    // Load data
    await this.loadUserCategories();
    await this.loadUserAccounts();
    await this.loadContent();

    // Setup listeners
    this.setupEventListeners();

    // Check URL hash for direct actions
    if (window.location.hash === '#settings') {
      this.showSettingsModal();
    }
  }

  async loadUserCategories() {
    this.userCategories = await this.storage.getUserCategories();
  }

  async loadUserAccounts() {
    this.userAccounts = await this.storage.getUserAccounts();
  }

  async loadContent() {
    const loadingEl = document.querySelector('.loading');
    if (loadingEl) loadingEl.style.display = 'block';

    try {
      // Load all interactions
      const response = await chrome.runtime.sendMessage({ type: 'GET_INTERACTIONS' });

      if (response && response.success) {
        this.allItems = response.data;
        this.loadCategoriesFromContent();
        this.filterAndDisplayContent();
      } else {
        console.error('Failed to load content:', response?.error);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  loadCategoriesFromContent() {
    // Extract unique categories from content
    const contentCategories = new Set();
    this.allItems.forEach(item => {
      if (item.categories) {
        item.categories.forEach(cat => contentCategories.add(cat));
      }
    });

    // Merge with user categories and sort
    const uniqueCats = [...new Set([...contentCategories, ...this.userCategories])].sort();

    // Render
    this.contentRenderer.renderCategories(uniqueCats, this.currentFilters.category);
  }

  filterAndDisplayContent() {
    // Filter
    const filtered = this.filtersManager.filterContent(this.allItems, this.currentFilters);

    // Sort
    const sorted = this.filtersManager.sortContent(filtered, this.currentFilters.sort);

    // Render
    this.contentRenderer.renderContent(sorted, this.viewMode);
  }

  // --- Actions ---

  setFilter(type, value) {
    this.currentFilters[type] = value;

    // Update UI active states handled by renderer redraw or specific updates
    if (type === 'platform') {
      document.querySelectorAll('.platform-list li').forEach(el => {
        el.classList.toggle('active', el.dataset.platform === value);
      });
    } else if (type === 'category') {
      // Update sidebar category active state without full re-render of list if possible,
      // but simpler to just re-render list or update classes
      document.querySelectorAll('#category-list li').forEach(el => {
        el.classList.toggle('active', el.dataset.category === value);
      });
    }

    this.filterAndDisplayContent();
  }

  setSort(value) {
    this.currentFilters.sort = value;
    this.filterAndDisplayContent();
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    document.getElementById('view-toggle').textContent = this.viewMode === 'grid' ? 'List View' : 'Grid View';
    this.filterAndDisplayContent();
  }

  async deleteItem(id) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_INTERACTION',
        id
      });

      if (response && response.success) {
        // Remove from local array
        this.allItems = this.allItems.filter(item => item.id !== id);
        this.filterAndDisplayContent();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item: ' + error.message);
    }
  }

  async updateItemCategories(id, categories) {
    try {
      // Optimistic update
      const itemIndex = this.allItems.findIndex(i => i.id === id);
      if (itemIndex !== -1) {
        this.allItems[itemIndex].categories = categories;
        // If AI failed before, manual update resolves it
        if (categories.length > 0 && categories[0] !== 'Uncategorized') {
          // We keep aiProcessed=true but clear failure reason effectively by it being manual
        }
        this.filterAndDisplayContent();
      }

      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id,
        updates: { categories }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error updating categories:', error);
      alert('Failed to save categories: ' + error.message);
      // Revert reload
      this.loadContent();
    }
  }

  // --- Modals Integration ---

  async showSettingsModal() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      await this.loadUserAccounts(); // Refresh accounts

      if (response && response.success) {
        this.modalsManager.showSettingsModal(
          response.data,
          this.userCategories,
          this.userAccounts
        );
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  openEditCategoriesModal(item) {
    this.modalsManager.showEditCategoriesModal(item, this.userCategories);
  }

  async saveSettings(updates) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        updates
      });

      if (response && response.success) {
        alert('Settings saved successfully!');
        // Reload to apply changes (e.g. platforms)
        window.location.reload();
      } else {
        throw new Error(response?.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    }
  }

  async addCustomCategory(name) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_CATEGORIES',
        categories: [...this.userCategories, name]
      });

      if (response && response.success) {
        this.userCategories.push(name);
        this.modalsManager.renderCustomCategories(this.userCategories);
        this.loadCategoriesFromContent(); // Update sidebar
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }

  async deleteCustomCategory(name) {
    try {
      const newCats = this.userCategories.filter(c => c !== name);
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_CATEGORIES',
        categories: newCats
      });

      if (response && response.success) {
        this.userCategories = newCats;
        this.modalsManager.renderCustomCategories(this.userCategories);
        this.loadCategoriesFromContent(); // Update sidebar
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }

  async exportData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
      if (response && response.success) {
        const url = response.data;
        const a = document.createElement('a');
        a.href = url;
        a.download = `content-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Export failed: ' + error.message);
    }
  }

  setupEventListeners() {
    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.setFilter('search', e.target.value);
    });

    // Platform filters
    document.querySelectorAll('.platform-list li').forEach(li => {
      li.addEventListener('click', () => {
        this.setFilter('platform', li.dataset.platform);
      });
    });

    // Sort
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
      this.setSort(e.target.value);
    });

    // View Toggle
    document.getElementById('view-toggle')?.addEventListener('click', () => {
      this.toggleViewMode();
    });

    // Sidebar buttons
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportData();
    });
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager();
});
