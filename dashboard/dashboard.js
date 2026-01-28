import { StorageManager } from '../lib/storage-manager.js';
import { ContentRenderer } from './modules/content-renderer.js';
import { FiltersManager } from './modules/filters-manager.js';
import { ModalsManager } from './modules/modals-manager.js';
import { AccountsManager } from './modules/accounts-manager.js';
import { truncateText, formatDate } from '../lib/utils.js';

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
      sort: 'date-desc',
      includeCategories: [],
      excludeCategories: []
    };
    this.viewMode = 'grid';
    this.allItems = [];
    this.itemsById = new Map();
    this.userCategories = [];
    this.userAccounts = {};
    this.availableCategories = [];
    this.aiSeedDefaults = null;
    this.aiSeedSourceCategory = null;
    this.aiTokenCache = new Map();
    this.aiSuggestedItems = [];
    this.aiSuggestedScoreMap = new Map();
    this.aiReorgSelection = new Set();
    this.aiReorgSuggestions = [];
    this.aiReorgNotes = '';
    this.aiFilters = {
      seedQuery: '',
      suggestedQuery: '',
      mode: 'text',
      sensitivity: 50
    };
    this.instagramCaptionFetchAttempted = new Set();
    this.thumbnailBackfillAttempted = new Set();
    this.thumbnailBackfillQueue = [];
    this.thumbnailBackfillActive = false;
    this.instagramUrlCleanupRan = false;

    // Bulk selection mode
    this.selectMode = false;
    this.selectedItems = new Set();

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
    this.exposeDebugHelpers();

    // Check URL hash for direct actions
    if (window.location.hash === '#settings') {
      this.showSettingsModal();
    }
  }


  exposeDebugHelpers() {
    if (typeof window === 'undefined') return;
    window.ctGetStoredInteractions = this.getStoredInteractions.bind(this);
  }

  async getStoredInteractions() {
    const { interactions = [] } = await chrome.storage.local.get('interactions');
    return interactions;
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
        this.itemsById = new Map(this.allItems.map(item => [item.id, item]));
        this.aiTokenCache = new Map();
        this.aiSuggestedItems = [];
        this.aiSuggestedScoreMap = new Map();
        this.cleanupInstagramUrls();
        this.loadCategoriesFromContent();
        this.updateCategorySuggestionBar();
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

  cleanupInstagramUrls() {
    if (this.instagramUrlCleanupRan) return;
    this.instagramUrlCleanupRan = true;
    const updates = [];

    this.allItems.forEach(item => {
      if (!item || item.platform !== 'instagram') return;
      const url = item.content?.url;
      if (!url) return;
      const normalized = this.normalizeInstagramUrl(url);
      if (normalized && normalized !== url) {
        const updatedContent = { ...item.content, url: normalized };
        item.content = updatedContent;
        this.itemsById.set(item.id, item);
        updates.push({ id: item.id, updates: { content: updatedContent } });
      }
    });

    if (updates.length === 0) return;

    updates.forEach(({ id, updates: data }) => {
      chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id,
        updates: data
      }).catch(() => {});
    });
  }

  normalizeInstagramUrl(url) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes('instagram.com')) return url;
      let path = parsed.pathname;
      path = path.replace(/\/liked_by\/?$/i, '/');
      path = path.replace(/\/comments\/?$/i, '/');
      path = path.replace(/\/(reel|p)\/([^\/]+)\/.+$/i, '/$1/$2/');
      parsed.pathname = path;
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch (error) {
      return url;
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
    this.availableCategories = uniqueCats;

    // Render
    const categoryCounts = this.getCategoryCounts();
    this.contentRenderer.renderCategories(
      uniqueCats,
      this.currentFilters.category,
      categoryCounts,
      this.allItems.length
    );
    this.updateCategoryFilterOptions(uniqueCats);
    this.updateReorgCategoryList();
  }

  getCategoryCounts() {
    const counts = new Map();

    this.allItems.forEach(item => {
      const categories = item?.categories || [];
      categories.forEach(category => {
        if (!category) return;
        const parts = category.split('/');
        for (let i = 0; i < parts.length; i += 1) {
          const path = parts.slice(0, i + 1).join('/');
          counts.set(path, (counts.get(path) || 0) + 1);
        }
      });
    });

    return counts;
  }

  filterAndDisplayContent() {
    // Filter
    const filtered = this.filtersManager.filterContent(this.allItems, this.currentFilters);

    // Sort
    const sorted = this.filtersManager.sortContent(filtered, this.currentFilters.sort);

    // Render (pass selectMode and selectedItems)
    this.contentRenderer.renderContent(sorted, this.viewMode, this.selectMode, this.selectedItems);
    this.queueInstagramCaptionFetch(sorted);
    this.queueThumbnailBackfill(sorted);

    // Update selection bar if in select mode
    if (this.selectMode) {
      this.updateSelectionBar();
    }
  }

  queueInstagramCaptionFetch(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    items.forEach(item => {
      if (!item || item.platform !== 'instagram' || !item.id) return;
      if (this.instagramCaptionFetchAttempted.has(item.id)) return;
      const displayText = this.getDisplayText(item);
      if (displayText) return;
      if (!item.content?.url) return;
      this.instagramCaptionFetchAttempted.add(item.id);
      this.maybeFetchInstagramCaption(item);
    });
  }

  queueThumbnailBackfill(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const now = Date.now();
    items.forEach(item => {
      if (!item || !item.id) return;
      if (this.thumbnailBackfillAttempted.has(item.id)) return;
      if (!this.shouldBackfillThumbnail(item, now)) return;
      this.thumbnailBackfillAttempted.add(item.id);
      this.thumbnailBackfillQueue.push(item);
    });
    this.processThumbnailBackfillQueue();
  }

  shouldBackfillThumbnail(item, now) {
    if (!item || !item.content) return false;
    if (!(item.platform === 'instagram' || item.platform === 'tiktok')) return false;
    if (!item.content.videoUrl) return false;
    if (item.content.previewDataUrl) return false;
    if (item.content.imageUrls && item.content.imageUrls.length > 0) return false;
    if (!item.content.url) return false;
    const fetchedAt = item.content.thumbnailFetchedAt || 0;
    const ttlMs = 14 * 24 * 60 * 60 * 1000;
    if (fetchedAt && (now - fetchedAt) < ttlMs) return false;
    return true;
  }

  processThumbnailBackfillQueue() {
    if (this.thumbnailBackfillActive) return;
    if (this.thumbnailBackfillQueue.length === 0) return;
    this.thumbnailBackfillActive = true;
    const item = this.thumbnailBackfillQueue.shift();
    const jitterMs = 2000 + Math.floor(Math.random() * 3000);
    setTimeout(async () => {
      try {
        await this.fetchThumbnailForItem(item);
      } finally {
        this.thumbnailBackfillActive = false;
        this.processThumbnailBackfillQueue();
      }
    }, jitterMs);
  }

  async fetchThumbnailForItem(item) {
    if (!item || !item.content?.url) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_POST_THUMBNAIL',
        url: item.content.url
      });
      const thumbnailUrl = (response?.success ? response.thumbnailUrl : '').trim();
      const updatedContent = {
        ...item.content,
        thumbnailFetchedAt: Date.now()
      };
      if (thumbnailUrl) {
        updatedContent.imageUrls = [thumbnailUrl];
      }
      item.content = updatedContent;
      this.itemsById.set(item.id, item);
      const index = this.allItems.findIndex(entry => entry.id === item.id);
      if (index !== -1) {
        this.allItems[index] = item;
      }
      await chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id: item.id,
        updates: { content: updatedContent }
      });
      if (thumbnailUrl) {
        this.filterAndDisplayContent();
      }
    } catch (error) {
      console.warn('Failed to backfill thumbnail:', error);
    }
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
    if (type === 'category') {
      this.updateCategorySuggestionBar();
    }
  }

  updateCategorySuggestionBar() {
    const bar = document.getElementById('category-ai-suggestion');
    const nameEl = document.getElementById('category-ai-name');
    if (!bar || !nameEl) return;

    const activeCategory = this.currentFilters.category;
    if (!activeCategory || activeCategory === 'all') {
      bar.classList.add('hidden');
      nameEl.textContent = '';
      return;
    }

    nameEl.textContent = activeCategory;
    bar.classList.remove('hidden');
  }

  updateCategoryFilterOptions(categories) {
    const includeList = document.getElementById('include-category-list');
    const excludeList = document.getElementById('exclude-category-list');
    if (!includeList || !excludeList) return;

    const validCategories = new Set(categories || []);
    this.currentFilters.includeCategories = (this.currentFilters.includeCategories || [])
      .filter(cat => validCategories.has(cat));
    this.currentFilters.excludeCategories = (this.currentFilters.excludeCategories || [])
      .filter(cat => validCategories.has(cat));

    includeList.innerHTML = '';
    excludeList.innerHTML = '';

    if (!categories || categories.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'filter-empty';
      empty.textContent = 'No categories yet.';
      includeList.appendChild(empty.cloneNode(true));
      excludeList.appendChild(empty);
      return;
    }

    const includeSet = new Set(this.currentFilters.includeCategories || []);
    const excludeSet = new Set(this.currentFilters.excludeCategories || []);

    categories.forEach(category => {
      const includeItem = this.buildCategoryFilterItem(category, 'include', includeSet.has(category));
      const excludeItem = this.buildCategoryFilterItem(category, 'exclude', excludeSet.has(category));
      includeList.appendChild(includeItem);
      excludeList.appendChild(excludeItem);
    });

    this.updateCategoryFilterCount();
  }

  updateReorgCategoryList() {
    const modal = document.getElementById('ai-reorg-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    this.renderReorgCategoryList();
  }

  buildCategoryFilterItem(category, mode, checked) {
    const label = document.createElement('label');
    label.className = 'filter-category-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'category-filter-checkbox';
    checkbox.dataset.mode = mode;
    checkbox.dataset.category = category;
    checkbox.checked = checked;

    const name = document.createElement('span');
    name.className = 'filter-category-name';
    name.textContent = category;

    label.appendChild(checkbox);
    label.appendChild(name);
    return label;
  }

  handleCategoryFilterToggle(mode, category, checked) {
    const include = this.currentFilters.includeCategories;
    const exclude = this.currentFilters.excludeCategories;

    if (mode === 'include') {
      if (checked && !include.includes(category)) include.push(category);
      if (!checked) this.currentFilters.includeCategories = include.filter(cat => cat !== category);

      if (checked && exclude.includes(category)) {
        this.currentFilters.excludeCategories = exclude.filter(cat => cat !== category);
        const excludeBox = document.querySelector(
          `.category-filter-checkbox[data-mode="exclude"][data-category="${CSS.escape(category)}"]`
        );
        if (excludeBox) excludeBox.checked = false;
      }
    } else {
      if (checked && !exclude.includes(category)) exclude.push(category);
      if (!checked) this.currentFilters.excludeCategories = exclude.filter(cat => cat !== category);

      if (checked && include.includes(category)) {
        this.currentFilters.includeCategories = include.filter(cat => cat !== category);
        const includeBox = document.querySelector(
          `.category-filter-checkbox[data-mode="include"][data-category="${CSS.escape(category)}"]`
        );
        if (includeBox) includeBox.checked = false;
      }
    }

    this.updateCategoryFilterCount();
    this.filterAndDisplayContent();
  }

  updateCategoryFilterCount() {
    const count = (this.currentFilters.includeCategories?.length || 0)
      + (this.currentFilters.excludeCategories?.length || 0);
    const countEl = document.getElementById('category-filter-count');
    if (!countEl) return;
    if (count === 0) {
      countEl.textContent = '0';
      countEl.classList.add('hidden');
      return;
    }
    countEl.textContent = String(count);
    countEl.classList.remove('hidden');
  }

  clearCategoryFilters() {
    this.currentFilters.includeCategories = [];
    this.currentFilters.excludeCategories = [];
    document.querySelectorAll('.category-filter-checkbox').forEach(box => {
      box.checked = false;
    });
    this.updateCategoryFilterCount();
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
        this.itemsById.delete(id);
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
        this.itemsById.set(id, this.allItems[itemIndex]);
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

  // --- AI Tools ---

  getUncategorizedItems() {
    return this.allItems.filter(item => {
      const categories = item.categories || [];
      return categories.length === 0 || (categories.length === 1 && categories[0] === 'Uncategorized');
    });
  }

  async categorizeUncategorizedWithAI() {
    const items = this.getUncategorizedItems();
    if (items.length === 0) {
      alert('No uncategorized items found.');
      return;
    }

    const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = settingsResponse?.data || {};
    const hasApiKey = Boolean(
      settings.openaiApiKey ||
      settings.geminiApiKey ||
      settings.apiKey
    );

    if (!hasApiKey) {
      const openSettings = confirm('No AI API key configured. Open settings to add one?');
      if (openSettings) {
        this.showSettingsModal();
      }
      return;
    }

    const confirmed = confirm(`Send ${items.length} items to AI for categorization?`);
    if (!confirmed) return;

    try {
      for (const item of items) {
        await this.storage.queueForAI(item.id);
      }
      await chrome.runtime.sendMessage({ type: 'PROCESS_AI_QUEUE' });
      alert(`Queued ${items.length} items for AI categorization.`);
    } catch (error) {
      console.error('Error queueing AI categorization:', error);
      alert('Failed to queue AI categorization: ' + error.message);
    }
  }

  updateCategoryDatalist() {
    const datalist = document.getElementById('ai-category-options');
    if (!datalist) return;

    const categories = new Set(this.userCategories);
    this.allItems.forEach(item => {
      if (item.categories) {
        item.categories.forEach(cat => {
          if (cat && cat !== 'Uncategorized') categories.add(cat);
        });
      }
    });

    datalist.innerHTML = '';
    [...categories].sort().forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      datalist.appendChild(option);
    });
  }

  openAICategoryModal() {
    const modal = document.getElementById('ai-category-modal');
    if (!modal) return;

    const categoryInput = document.getElementById('ai-category-name');
    if (categoryInput) categoryInput.value = '';

    const status = document.getElementById('ai-similar-status');
    if (status) status.textContent = '';

    this.aiFilters.seedQuery = '';
    this.aiFilters.suggestedQuery = '';
    this.aiFilters.mode = 'text';
    this.aiFilters.sensitivity = 50;
    this.aiSeedDefaults = null;
    this.aiSeedSourceCategory = null;

    const seedFilter = document.getElementById('ai-seed-filter');
    const suggestedFilter = document.getElementById('ai-suggested-filter');
    if (seedFilter) seedFilter.value = '';
    if (suggestedFilter) suggestedFilter.value = '';

    const filterMode = document.getElementById('ai-filter-mode');
    if (filterMode) filterMode.value = 'text';

    const slider = document.getElementById('ai-similarity-slider');
    if (slider) slider.value = '50';
    this.updateSimilarityLabel(50);

    this.updateCategoryDatalist();
    this.renderAiSeedList();
    this.aiSuggestedItems = [];
    this.aiSuggestedScoreMap = new Map();
    this.renderAiSuggestedList([]);

    modal.classList.remove('hidden');
  }

  openAICategoryModalForCategory(categoryName) {
    if (!categoryName || categoryName === 'all') return;
    this.openAICategoryModal();

    const categoryInput = document.getElementById('ai-category-name');
    if (categoryInput) categoryInput.value = categoryName;

    const seedItems = this.allItems
      .filter(item => item.categories && item.categories.includes(categoryName))
      .sort((a, b) => b.timestamp - a.timestamp);

    this.aiSeedSourceCategory = categoryName;
    this.aiSeedDefaults = new Set(seedItems.slice(0, 6).map(item => item.id));
    this.renderAiSeedList();

    if (seedItems.length > 0) {
      this.findSimilarItems();
    } else {
      const status = document.getElementById('ai-similar-status');
      if (status) status.textContent = 'No items in this category yet. Add a few examples first.';
    }
  }

  closeAICategoryModal() {
    document.getElementById('ai-category-modal')?.classList.add('hidden');
  }

  openAIReorgModal() {
    const modal = document.getElementById('ai-reorg-modal');
    if (!modal) return;

    this.aiReorgSelection = new Set();
    this.aiReorgSuggestions = [];
    this.aiReorgNotes = '';

    const actionSelect = document.getElementById('ai-reorg-action');
    if (actionSelect) actionSelect.value = 'merge';

    const searchInput = document.getElementById('ai-reorg-search');
    if (searchInput) searchInput.value = '';

    const goalInput = document.getElementById('ai-reorg-goal');
    if (goalInput) goalInput.value = '';

    this.renderReorgCategoryList();
    this.renderReorgSuggestions();
    this.updateReorgApplyState();

    modal.classList.remove('hidden');
  }

  closeAIReorgModal() {
    document.getElementById('ai-reorg-modal')?.classList.add('hidden');
  }

  renderReorgCategoryList() {
    const container = document.getElementById('ai-reorg-category-list');
    if (!container) return;

    container.innerHTML = '';
    const query = (document.getElementById('ai-reorg-search')?.value || '').trim().toLowerCase();
    const categories = (this.availableCategories || [])
      .filter(cat => cat && cat !== 'Uncategorized')
      .filter(cat => !query || cat.toLowerCase().includes(query));

    if (categories.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ai-reorg-empty';
      empty.textContent = 'No categories found.';
      container.appendChild(empty);
      return;
    }

    categories.forEach(category => {
      const row = document.createElement('label');
      row.className = 'ai-reorg-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.category = category;
      checkbox.checked = this.aiReorgSelection.has(category);

      const text = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'ai-reorg-item-title';
      title.textContent = category;
      text.appendChild(title);

      row.appendChild(checkbox);
      row.appendChild(text);
      container.appendChild(row);
    });
  }

  updateReorgSelection(category, checked) {
    if (!category) return;
    if (checked) {
      this.aiReorgSelection.add(category);
    } else {
      this.aiReorgSelection.delete(category);
    }
  }

  renderReorgSuggestions() {
    const container = document.getElementById('ai-reorg-results');
    if (!container) return;
    container.innerHTML = '';

    if (!this.aiReorgSuggestions || this.aiReorgSuggestions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ai-reorg-empty';
      empty.textContent = 'No suggestions yet. Select categories and click "Get suggestions".';
      container.appendChild(empty);
      return;
    }

    this.aiReorgSuggestions.forEach((suggestion, index) => {
      const row = document.createElement('label');
      row.className = 'ai-reorg-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.index = String(index);
      checkbox.checked = suggestion.apply !== false;

      const text = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'ai-reorg-item-title';

      const fromLabel = Array.isArray(suggestion.from)
        ? suggestion.from.join(', ')
        : suggestion.from;
      const toLabel = Array.isArray(suggestion.to)
        ? suggestion.to.join(', ')
        : suggestion.to;

      title.textContent = `${fromLabel || 'Unknown'} → ${toLabel || 'Unknown'}`;
      text.appendChild(title);

      if (suggestion.reason) {
        const sub = document.createElement('div');
        sub.className = 'ai-reorg-item-sub';
        sub.textContent = suggestion.reason;
        text.appendChild(sub);
      }

      row.appendChild(checkbox);
      row.appendChild(text);
      container.appendChild(row);
    });

    if (this.aiReorgNotes) {
      const note = document.createElement('div');
      note.className = 'ai-reorg-note';
      note.textContent = this.aiReorgNotes;
      container.appendChild(note);
    }
  }

  updateReorgApplyState() {
    const applyBtn = document.getElementById('ai-reorg-apply');
    if (!applyBtn) return;
    const canApply = this.aiReorgSuggestions.some(suggestion =>
      typeof suggestion.from === 'string' && typeof suggestion.to === 'string' && suggestion.from && suggestion.to
    );
    applyBtn.disabled = !canApply;
  }

  async requestReorgSuggestions() {
    const status = document.getElementById('ai-reorg-status');
    const selected = Array.from(this.aiReorgSelection);
    const action = document.getElementById('ai-reorg-action')?.value || 'organize';
    const goal = document.getElementById('ai-reorg-goal')?.value.trim() || '';

    if (selected.length === 0) {
      alert('Select at least one category.');
      return;
    }

    if (action === 'merge' && selected.length < 2) {
      alert('Select at least two categories to merge.');
      return;
    }

    if (status) status.textContent = 'Generating suggestions...';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SUGGEST_CATEGORY_REORG',
        payload: {
          action,
          categories: selected,
          goal
        }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to generate suggestions');
      }

      const suggestions = response.data?.suggestions || [];
      this.aiReorgNotes = response.data?.notes || '';
      this.aiReorgSuggestions = suggestions.map(suggestion => ({
        ...suggestion,
        apply: true
      }));
      this.renderReorgSuggestions();
      this.updateReorgApplyState();

      if (status) {
        status.textContent = suggestions.length
          ? `Suggested ${suggestions.length} changes.`
          : 'No changes suggested for these categories.';
      }
    } catch (error) {
      console.error('Error generating category suggestions:', error);
      if (status) status.textContent = 'Failed to generate suggestions.';
      alert('Failed to generate suggestions: ' + error.message);
    }
  }

  async applyReorgSuggestions() {
    const selections = [...document.querySelectorAll('#ai-reorg-results input[type=\"checkbox\"][data-index]')];
    const mappings = selections
      .filter(input => input.checked)
      .map(input => this.aiReorgSuggestions[Number(input.dataset.index)])
      .filter(suggestion => typeof suggestion?.from === 'string' && typeof suggestion?.to === 'string');

    if (mappings.length === 0) {
      alert('No applicable changes selected.');
      return;
    }

    await this.applyCategoryReorgMappings(mappings);
    this.closeAIReorgModal();
  }

  renderAiSeedList() {
    const sourceItems = this.aiSeedSourceCategory
      ? this.allItems.filter(item =>
        item.categories && item.categories.includes(this.aiSeedSourceCategory))
      : this.allItems;
    const sorted = [...sourceItems].sort((a, b) => b.timestamp - a.timestamp);
    this.renderAiItemList(sorted, 'ai-seed-list', {
      defaultChecked: false,
      defaultCheckedIds: this.aiSeedDefaults,
      filterText: this.aiFilters.seedQuery,
      filterMode: this.aiFilters.mode,
      checkedIds: this.getCheckedIdSet('ai-seed-list')
    });
    this.aiSeedDefaults = null;
  }

  renderAiSuggestedList(items, scoreMap = null) {
    this.renderAiItemList(items, 'ai-suggested-list', {
      defaultChecked: true,
      scoreMap,
      filterText: this.aiFilters.suggestedQuery,
      filterMode: this.aiFilters.mode,
      checkedIds: this.getCheckedIdSet('ai-suggested-list')
    });
  }

  updateAiSeedList() {
    this.renderAiSeedList();
  }

  updateAiSuggestedList() {
    this.renderAiSuggestedList(this.aiSuggestedItems, this.aiSuggestedScoreMap);
  }

  renderAiItemList(items, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const filteredItems = this.filterAiItems(items, options.filterText, options.filterMode);
    const hasItems = items.length > 0;

    if (filteredItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ai-empty-state';
      if (hasItems) {
        empty.textContent = 'No matches for the current filter.';
      } else {
        empty.textContent = containerId === 'ai-suggested-list'
          ? 'No suggestions yet. Choose examples and click "Find similar".'
          : 'No items available.';
      }
      container.appendChild(empty);
      return;
    }

    filteredItems.forEach(item => {
      const row = document.createElement('label');
      row.className = 'ai-item-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.id = item.id;
      const hasCheckedIds = options.checkedIds && options.checkedIds.size > 0;
      if (options.checkedIds && options.checkedIds.has(item.id)) {
        checkbox.checked = true;
      } else if (!hasCheckedIds && options.defaultCheckedIds && options.defaultCheckedIds.has(item.id)) {
        checkbox.checked = true;
      } else {
        checkbox.checked = options.defaultChecked === true;
      }

      const content = document.createElement('div');

      const title = document.createElement('div');
      title.className = 'ai-item-title';
      title.textContent = `${item.platform || 'platform'} • ${item.metadata?.author || item.savedBy?.username || 'Unknown'}`;

      const text = document.createElement('div');
      text.className = 'ai-item-text';
      text.textContent = truncateText(item.content?.text || '', 140);

      const meta = document.createElement('div');
      meta.className = 'ai-item-meta';
      meta.textContent = formatDate(item.timestamp);

      content.appendChild(title);
      content.appendChild(text);
      content.appendChild(meta);

      row.appendChild(checkbox);
      row.appendChild(content);

      if (options.scoreMap && options.scoreMap.has(item.id)) {
        const score = document.createElement('div');
        score.className = 'ai-item-score';
        score.textContent = `${Math.round(options.scoreMap.get(item.id) * 100)}% match`;
        row.appendChild(score);
      } else {
        const spacer = document.createElement('div');
        row.appendChild(spacer);
      }

      container.appendChild(row);
    });
  }

  filterAiItems(items, filterText, filterMode) {
    if (!filterText) return items;
    const query = filterText.trim().toLowerCase();
    if (!query) return items;

    return items.filter(item => {
      const baseText = item.content?.text || '';
      const author = item.metadata?.author || item.savedBy?.username || '';
      const platform = item.platform || '';
      const combined = filterMode === 'full'
        ? `${baseText} ${author} ${platform}`
        : baseText;
      return combined.toLowerCase().includes(query);
    });
  }

  getCheckedIdSet(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return new Set();
    return new Set(
      [...container.querySelectorAll('input[type="checkbox"][data-id]:checked')].map(input => input.dataset.id)
    );
  }

  attachDebouncedInput(element, handler, delay = 200) {
    if (!element) return;
    let timer = null;
    element.addEventListener('input', (event) => {
      const value = event.target.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => handler(value), delay);
    });
  }

  updateSimilarityLabel(value) {
    const label = document.getElementById('ai-similarity-label');
    if (!label) return;
    const config = this.getSimilarityConfig(value);
    label.textContent = config.label;
  }

  getSimilarityConfig(value = null) {
    const sliderValue = value !== null ? Number(value) : Number(this.aiFilters.sensitivity);
    if (sliderValue <= 33) {
      return { label: 'Strict', threshold: 0.25, maxSuggestions: 30 };
    }
    if (sliderValue >= 67) {
      return { label: 'Loose', threshold: 0.12, maxSuggestions: 75 };
    }
    return { label: 'Balanced', threshold: 0.18, maxSuggestions: 50 };
  }

  tokenizeText(text) {
    if (!text) return new Set();
    const stopwords = new Set([
      'the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'from', 'are',
      'was', 'were', 'been', 'have', 'has', 'had', 'but', 'not', 'they', 'their',
      'about', 'into', 'out', 'over', 'under', 'more', 'less', 'just', 'like',
      'what', 'when', 'where', 'who', 'why', 'how', 'can', 'could', 'would',
      'should', 'a', 'an', 'of', 'to', 'in', 'on', 'it', 'is', 'as', 'at', 'by'
    ]);

    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !stopwords.has(token));

    return new Set(tokens);
  }

  getItemTokens(item) {
    if (this.aiTokenCache.has(item.id)) {
      return this.aiTokenCache.get(item.id);
    }

    const combined = [
      item.content?.text || '',
      item.metadata?.author || '',
      item.platform || ''
    ].join(' ');

    const tokens = this.tokenizeText(combined);
    this.aiTokenCache.set(item.id, tokens);
    return tokens;
  }

  computeSimilarity(tokensA, tokensB) {
    if (!tokensA.size || !tokensB.size) return 0;

    let intersection = 0;
    tokensA.forEach(token => {
      if (tokensB.has(token)) intersection += 1;
    });
    const union = tokensA.size + tokensB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  async findSimilarItems() {
    const status = document.getElementById('ai-similar-status');
    const categoryName = document.getElementById('ai-category-name')?.value.trim();
    if (!categoryName) {
      alert('Please enter a category name first.');
      return;
    }

    const seedIds = this.getCheckedIds('ai-seed-list');
    if (seedIds.length === 0) {
      alert('Select at least one example item.');
      return;
    }

    const seedItems = seedIds.map(id => this.itemsById.get(id)).filter(Boolean);
    const seedIdSet = new Set(seedItems.map(item => item.id));
    const seedTokenSets = seedItems.map(item => this.getItemTokens(item));

    const candidates = this.allItems.filter(item => {
      const categories = item.categories || [];
      const hasCategory = categories.includes(categoryName);
      return !hasCategory && !seedIdSet.has(item.id);
    });

    const scored = [];
    candidates.forEach(item => {
      const itemTokens = this.getItemTokens(item);
      const best = seedTokenSets.reduce((max, seedTokens) => {
        const score = this.computeSimilarity(seedTokens, itemTokens);
        return score > max ? score : max;
      }, 0);
      if (best > 0) {
        scored.push({ item, score: best });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    const config = this.getSimilarityConfig();
    const suggestions = scored
      .filter(entry => entry.score >= config.threshold)
      .filter(entry => !(entry.item.categories || []).includes(categoryName))
      .slice(0, config.maxSuggestions);
    const scoreMap = new Map(suggestions.map(entry => [entry.item.id, entry.score]));
    this.aiSuggestedItems = suggestions.map(entry => entry.item);
    this.aiSuggestedScoreMap = scoreMap;

    this.renderAiSuggestedList(this.aiSuggestedItems, this.aiSuggestedScoreMap);

    if (status) {
      status.textContent = suggestions.length
        ? `Found ${suggestions.length} similar items.`
        : 'No close matches found. Try selecting different examples.';
    }
  }

  async applyCategoryFromModal() {
    const categoryName = document.getElementById('ai-category-name')?.value.trim();
    if (!categoryName) {
      alert('Please enter a category name.');
      return;
    }

    const seedIds = this.getCheckedIds('ai-seed-list');
    const suggestedIds = this.getCheckedIds('ai-suggested-list');
    const allIds = [...new Set([...seedIds, ...suggestedIds])];

    if (allIds.length === 0) {
      alert('Select at least one item to apply the category.');
      return;
    }

    await this.ensureUserCategory(categoryName);
    await this.applyCategoryToItems(categoryName, allIds);
    this.closeAICategoryModal();
  }

  getCheckedIds(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return [...container.querySelectorAll('input[type="checkbox"][data-id]:checked')]
      .map(input => input.dataset.id);
  }

  async ensureUserCategory(name) {
    if (!this.userCategories.includes(name)) {
      await this.addCustomCategory(name);
    }
  }

  async applyCategoryReorgMappings(mappings) {
    const renameMap = new Map();
    mappings.forEach(mapping => {
      if (!mapping || typeof mapping.from !== 'string' || typeof mapping.to !== 'string') return;
      if (!mapping.from || !mapping.to || mapping.from === mapping.to) return;
      renameMap.set(mapping.from, mapping.to);
    });

    if (renameMap.size === 0) return;

    const updates = [];
    this.allItems.forEach(item => {
      const current = item.categories || [];
      if (current.length === 0) return;
      let changed = false;
      const updated = current.map(cat => {
        if (renameMap.has(cat)) {
          changed = true;
          return renameMap.get(cat);
        }
        return cat;
      });

      if (!changed) return;
      const unique = [...new Set(updated.filter(Boolean))];
      updates.push({ id: item.id, categories: unique });
    });

    if (updates.length === 0) return;

    // Optimistic update
    updates.forEach(update => {
      const itemIndex = this.allItems.findIndex(i => i.id === update.id);
      if (itemIndex !== -1) {
        this.allItems[itemIndex].categories = update.categories;
        this.itemsById.set(update.id, this.allItems[itemIndex]);
      }
    });

    if (renameMap.has(this.currentFilters.category)) {
      this.currentFilters.category = renameMap.get(this.currentFilters.category);
      this.updateCategorySuggestionBar();
    }

    this.filterAndDisplayContent();
    this.loadCategoriesFromContent();

    const results = await Promise.all(
      updates.map(update => chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id: update.id,
        updates: { categories: update.categories }
      }))
    );

    const failures = results.filter(result => !result?.success);
    if (failures.length) {
      console.error('Some category reorg updates failed:', failures);
      alert(`${failures.length} items failed to update. Reloading to sync.`);
      this.loadContent();
    }

    const updatedUserCategories = new Set(this.userCategories);
    renameMap.forEach((to, from) => {
      updatedUserCategories.delete(from);
      updatedUserCategories.add(to);
    });

    const updatedList = [...updatedUserCategories];
    await chrome.runtime.sendMessage({
      type: 'UPDATE_USER_CATEGORIES',
      categories: updatedList
    });

    this.userCategories = updatedList;
    this.modalsManager.renderCustomCategories(this.userCategories);
    this.loadCategoriesFromContent();
  }

  async applyCategoryToItems(category, itemIds) {
    const updates = [];

    itemIds.forEach(id => {
      const item = this.itemsById.get(id);
      if (!item) return;

      const categories = (item.categories || []).filter(cat => cat !== 'Uncategorized');
      if (!categories.includes(category)) {
        categories.push(category);
      }

      updates.push({ id, categories });
    });

    if (updates.length === 0) return;

    updates.forEach(update => {
      const itemIndex = this.allItems.findIndex(i => i.id === update.id);
      if (itemIndex !== -1) {
        this.allItems[itemIndex].categories = update.categories;
        this.itemsById.set(update.id, this.allItems[itemIndex]);
      }
    });

    this.filterAndDisplayContent();
    this.loadCategoriesFromContent();

    const results = await Promise.all(
      updates.map(update => chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id: update.id,
        updates: { categories: update.categories }
      }))
    );

    const failures = results.filter(result => !result?.success);
    if (failures.length) {
      console.error('Some updates failed:', failures);
      alert('Some items failed to update. Reloading content to sync.');
      this.loadContent();
    }
  }

  loadImagePreview(imgEl, item) {
    const url = item?.content?.imageUrls?.[0];
    if (!imgEl || !url) return;
    if (this.shouldAvoidRemoteImage(url)) {
      this.requestImageDataUrl(url).then((dataUrl) => {
        if (dataUrl) {
          imgEl.src = dataUrl;
          this.persistPreviewDataUrl(item, dataUrl);
          this.maybeFetchInstagramCaption(item);
        } else {
          imgEl.classList.add('image-load-failed');
        }
      });
      return;
    }
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.src = url;

    const onError = async () => {
      if (imgEl.dataset.proxyTried === '1') return;
      imgEl.dataset.proxyTried = '1';
      const dataUrl = await this.requestImageDataUrl(url);
      if (!dataUrl) {
        imgEl.classList.add('image-load-failed');
        return;
      }
      imgEl.src = dataUrl;
      this.persistPreviewDataUrl(item, dataUrl);
      this.maybeFetchInstagramCaption(item);
    };

    imgEl.addEventListener('error', onError, { once: true });
  }

  async requestImageDataUrl(url) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_IMAGE_DATA_URL',
        url
      });
      return response?.success ? response.dataUrl : null;
    } catch (error) {
      console.warn('Image fetch failed:', error);
      return null;
    }
  }

  shouldAvoidRemoteImage(url) {
    try {
      const host = new URL(url).hostname;
      return host.includes('instagram') || host.includes('cdninstagram') || host.includes('fbcdn.net');
    } catch (error) {
      return false;
    }
  }

  async maybeFetchInstagramCaption(item) {
    try {
      if (!item || item.platform !== 'instagram') return;
      const displayText = this.getDisplayText(item);
      if (displayText) return;
      const postUrl = item.content?.url;
      if (!postUrl) return;

      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_INSTAGRAM_CAPTION',
        url: postUrl
      });

      const caption = (response?.success ? response.caption : '').trim();
      if (!caption) return;

      const updatedContent = {
        ...item.content,
        text: caption
      };

      item.content = updatedContent;
      this.itemsById.set(item.id, item);
      const index = this.allItems.findIndex(entry => entry.id === item.id);
      if (index !== -1) {
        this.allItems[index] = item;
      }

      this.updateCardText(item);

      await chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id: item.id,
        updates: { content: updatedContent }
      });
    } catch (error) {
      console.warn('Failed to fetch Instagram caption:', error);
    }
  }

  updateCardText(item) {
    if (!item || !item.id) return;
    const card = document.querySelector(`.content-card[data-id="${CSS.escape(item.id)}"]`);
    const textEl = card?.querySelector('.content-text');
    if (!textEl) return;
    const displayText = this.getDisplayText(item);
    textEl.textContent = truncateText(displayText, 150);
  }

  getDisplayText(item) {
    if (!item || !item.content) return '';
    const text = (item.content.text || '').trim();
    if (!text) return '';
    if (item.platform !== 'instagram') return text;
    return this.stripInstagramUsername(text, item.metadata?.author);
  }

  isUsernameOnlyCaption(text, author = '') {
    if (!text) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;

    const authorClean = (author || '').replace(/^@/, '').trim();
    const normalized = trimmed.replace(/^@/, '').trim();
    if (authorClean && normalized.toLowerCase() === authorClean.toLowerCase()) {
      return true;
    }

    if (!/\s/.test(trimmed)) {
      if (trimmed.startsWith('@')) return true;
      if (/^[\w.]+$/.test(trimmed) && /[._\d]/.test(trimmed)) {
        return true;
      }
    }

    return false;
  }

  stripInstagramUsername(text, author = '') {
    if (!text) return '';
    let cleaned = text.trim();
    const authorClean = (author || '').replace(/^@/, '').trim();

    // Prefer quoted caption if present (Instagram metadata format)
    const quoted = cleaned.match(/[“"]([^”"]+)[”"]/);
    if (quoted && quoted[1]) {
      return quoted[1].trim();
    }

    if (authorClean) {
      const direct = new RegExp(`^@?${this.escapeRegex(authorClean)}\\s*[\\-–—:·|]`, 'i');
      cleaned = cleaned.replace(direct, '').trim();

      const onIg = new RegExp(`^@?${this.escapeRegex(authorClean)}\\s+on\\s+instagram\\s*:?\\s*`, 'i');
      cleaned = cleaned.replace(onIg, '').trim();

      const photoBy = new RegExp(`^(photo|image)\\s+by\\s+@?${this.escapeRegex(authorClean)}\\s*:?\\s*`, 'i');
      cleaned = cleaned.replace(photoBy, '').trim();

      const byUser = new RegExp(`^by\\s+@?${this.escapeRegex(authorClean)}\\s*:?\\s*`, 'i');
      cleaned = cleaned.replace(byUser, '').trim();
    }

    cleaned = cleaned.replace(/^@[\w.]+\s*[:\-–—|·•]\s*/i, '').trim();
    cleaned = cleaned.replace(/^\s*on instagram\s*:?/i, '').trim();
    cleaned = cleaned.replace(/^@[\w.]+\s+on\s+instagram\s*:?/i, '').trim();
    cleaned = cleaned.replace(/^[\w.]+\s+on\s+instagram\s*:?/i, '').trim();
    cleaned = cleaned.replace(/^(photo|image)\s+by\s+@?[\w.]+\s*:?/i, '').trim();
    cleaned = cleaned.replace(/^by\s+@?[\w.]+\s*:?/i, '').trim();
    cleaned = cleaned.replace(/^@?[\w.]+\s*[|·•\-–—:]\s*/i, '').trim();

    // If the remaining text is just a username, blank it out
    if (/^@?[\w.]+$/.test(cleaned)) {
      return '';
    }

    return cleaned;
  }

  escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async persistPreviewDataUrl(item, dataUrl) {
    try {
      if (!item || !dataUrl) return;
      if (item.content?.previewDataUrl) return;

      const updatedContent = {
        ...item.content,
        previewDataUrl: dataUrl,
        previewCachedAt: Date.now()
      };

      item.content = updatedContent;
      this.itemsById.set(item.id, item);
      const index = this.allItems.findIndex(entry => entry.id === item.id);
      if (index !== -1) {
        this.allItems[index] = item;
      }

      await chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id: item.id,
        updates: { content: updatedContent }
      });
    } catch (error) {
      console.warn('Failed to persist preview data:', error);
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

    const filterBtn = document.getElementById('category-filter-btn');
    const filterPanel = document.getElementById('category-filter-panel');

    filterBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!filterPanel) return;
      filterPanel.classList.toggle('hidden');
      const expanded = !filterPanel.classList.contains('hidden');
      filterBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    filterPanel?.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    filterPanel?.addEventListener('change', (event) => {
      const target = event.target;
      if (!target || !target.classList.contains('category-filter-checkbox')) return;
      const mode = target.dataset.mode;
      const category = target.dataset.category;
      if (!mode || !category) return;
      this.handleCategoryFilterToggle(mode, category, target.checked);
    });

    document.getElementById('clear-category-filters')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.clearCategoryFilters();
    });

    document.getElementById('category-ai-btn')?.addEventListener('click', () => {
      this.openAICategoryModalForCategory(this.currentFilters.category);
    });

    document.getElementById('ai-reorg-search')?.addEventListener('input', () => {
      this.renderReorgCategoryList();
    });

    document.getElementById('ai-reorg-category-list')?.addEventListener('change', (event) => {
      const target = event.target;
      if (!target || target.type !== 'checkbox') return;
      const category = target.dataset.category;
      this.updateReorgSelection(category, target.checked);
    });

    document.getElementById('ai-reorg-generate')?.addEventListener('click', () => {
      this.requestReorgSuggestions();
    });

    document.getElementById('ai-reorg-apply')?.addEventListener('click', () => {
      this.applyReorgSuggestions();
    });

    document.getElementById('ai-reorg-cancel')?.addEventListener('click', () => {
      this.closeAIReorgModal();
    });

    document.getElementById('close-ai-reorg')?.addEventListener('click', () => {
      this.closeAIReorgModal();
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

    // AI Tools
    const aiFab = document.getElementById('ai-fab');
    document.getElementById('ai-fab-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      aiFab?.classList.toggle('open');
    });

    document.getElementById('ai-categorize-uncategorized')?.addEventListener('click', (e) => {
      e.stopPropagation();
      aiFab?.classList.remove('open');
      this.categorizeUncategorizedWithAI();
    });

    document.getElementById('ai-auto-categorize')?.addEventListener('click', (e) => {
      e.stopPropagation();
      aiFab?.classList.remove('open');
      this.openAICategoryModal();
    });

    document.getElementById('ai-reorg-categories')?.addEventListener('click', (e) => {
      e.stopPropagation();
      aiFab?.classList.remove('open');
      this.openAIReorgModal();
    });

    document.addEventListener('click', (event) => {
      if (aiFab && !aiFab.contains(event.target)) {
        aiFab.classList.remove('open');
      }
    });

    document.addEventListener('click', (event) => {
      if (!filterPanel || !filterBtn) return;
      if (filterPanel.classList.contains('hidden')) return;
      if (!filterPanel.contains(event.target) && !filterBtn.contains(event.target)) {
        filterPanel.classList.add('hidden');
        filterBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.getElementById('close-ai-category')?.addEventListener('click', () => {
      this.closeAICategoryModal();
    });

    document.getElementById('ai-cancel-category')?.addEventListener('click', () => {
      this.closeAICategoryModal();
    });

    document.getElementById('ai-find-similar')?.addEventListener('click', () => {
      this.findSimilarItems();
    });

    document.getElementById('ai-apply-category')?.addEventListener('click', () => {
      this.applyCategoryFromModal();
    });

    document.getElementById('ai-category-modal')?.addEventListener('click', (event) => {
      if (event.target?.id === 'ai-category-modal') {
        this.closeAICategoryModal();
      }
    });

    document.getElementById('ai-reorg-modal')?.addEventListener('click', (event) => {
      if (event.target?.id === 'ai-reorg-modal') {
        this.closeAIReorgModal();
      }
    });

    this.attachDebouncedInput(document.getElementById('ai-seed-filter'), (value) => {
      this.aiFilters.seedQuery = value;
      this.updateAiSeedList();
    });

    this.attachDebouncedInput(document.getElementById('ai-suggested-filter'), (value) => {
      this.aiFilters.suggestedQuery = value;
      this.updateAiSuggestedList();
    });

    document.getElementById('ai-filter-mode')?.addEventListener('change', (event) => {
      this.aiFilters.mode = event.target.value;
      this.updateAiSeedList();
      this.updateAiSuggestedList();
    });

    document.getElementById('ai-similarity-slider')?.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      this.aiFilters.sensitivity = value;
      this.updateSimilarityLabel(value);
    });

    // Bulk Selection Mode
    document.getElementById('select-mode-btn')?.addEventListener('click', () => {
      this.toggleSelectMode();
    });

    document.getElementById('bulk-edit-categories')?.addEventListener('click', () => {
      this.openBulkEditCategoriesModal();
    });

    document.getElementById('bulk-delete')?.addEventListener('click', () => {
      this.bulkDeleteSelected();
    });

    document.getElementById('cancel-selection')?.addEventListener('click', () => {
      this.exitSelectMode();
    });
  }

  // --- Bulk Selection Methods ---

  toggleSelectMode() {
    this.selectMode = !this.selectMode;
    this.selectedItems.clear();

    const btn = document.getElementById('select-mode-btn');
    const selectionBar = document.getElementById('selection-bar');

    if (this.selectMode) {
      btn?.classList.add('active');
      btn.textContent = 'Cancel';
    } else {
      btn?.classList.remove('active');
      btn.textContent = 'Select';
      selectionBar?.classList.add('hidden');
    }

    this.filterAndDisplayContent();
  }

  exitSelectMode() {
    this.selectMode = false;
    this.selectedItems.clear();

    const btn = document.getElementById('select-mode-btn');
    const selectionBar = document.getElementById('selection-bar');

    btn?.classList.remove('active');
    btn.textContent = 'Select';
    selectionBar?.classList.add('hidden');

    this.filterAndDisplayContent();
  }

  toggleItemSelection(itemId) {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }

    // Update card visual state
    const card = document.querySelector(`.content-card[data-id="${itemId}"]`);
    card?.classList.toggle('selected', this.selectedItems.has(itemId));

    this.updateSelectionBar();
  }

  updateSelectionBar() {
    const selectionBar = document.getElementById('selection-bar');
    const countEl = document.getElementById('selection-count');

    if (this.selectedItems.size > 0) {
      selectionBar?.classList.remove('hidden');
      if (countEl) countEl.textContent = this.selectedItems.size;
    } else {
      selectionBar?.classList.add('hidden');
    }
  }

  async openBulkEditCategoriesModal() {
    if (this.selectedItems.size === 0) {
      alert('No items selected.');
      return;
    }

    // Use the modals manager to show bulk edit modal
    this.modalsManager.showBulkEditCategoriesModal(
      Array.from(this.selectedItems),
      this.userCategories
    );
  }

  async bulkUpdateCategories(itemIds, categories, mode = 'replace') {
    const updates = [];

    for (const id of itemIds) {
      const item = this.itemsById.get(id);
      if (!item) continue;

      let newCategories;
      if (mode === 'replace') {
        newCategories = [...categories];
      } else if (mode === 'add') {
        const existing = (item.categories || []).filter(c => c !== 'Uncategorized');
        newCategories = [...new Set([...existing, ...categories])];
      }

      updates.push({ id, categories: newCategories });
    }

    if (updates.length === 0) return;

    // Optimistic update
    updates.forEach(update => {
      const itemIndex = this.allItems.findIndex(i => i.id === update.id);
      if (itemIndex !== -1) {
        this.allItems[itemIndex].categories = update.categories;
        this.itemsById.set(update.id, this.allItems[itemIndex]);
      }
    });

    this.filterAndDisplayContent();
    this.loadCategoriesFromContent();

    // Send updates to storage
    const results = await Promise.all(
      updates.map(update => chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id: update.id,
        updates: { categories: update.categories }
      }))
    );

    const failures = results.filter(result => !result?.success);
    if (failures.length) {
      console.error('Some bulk updates failed:', failures);
      alert(`${failures.length} items failed to update. Reloading to sync.`);
      this.loadContent();
    }

    // Exit select mode after successful operation
    this.exitSelectMode();
  }

  async bulkDeleteSelected() {
    if (this.selectedItems.size === 0) {
      alert('No items selected.');
      return;
    }

    const confirmed = confirm(`Delete ${this.selectedItems.size} selected items? This cannot be undone.`);
    if (!confirmed) return;

    const itemIds = Array.from(this.selectedItems);
    let successCount = 0;

    for (const id of itemIds) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'DELETE_INTERACTION',
          id
        });

        if (response?.success) {
          this.allItems = this.allItems.filter(item => item.id !== id);
          this.itemsById.delete(id);
          successCount++;
        }
      } catch (error) {
        console.error('Error deleting item:', id, error);
      }
    }

    alert(`Deleted ${successCount} of ${itemIds.length} items.`);
    this.exitSelectMode();
    this.filterAndDisplayContent();
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager();
});
