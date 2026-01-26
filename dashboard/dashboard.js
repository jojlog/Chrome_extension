// Dashboard Manager
class DashboardManager {
  constructor() {
    this.currentFilters = {
      platform: 'all',
      category: 'all',
      search: '',
      sort: 'date-desc'
    };
    this.viewMode = 'grid';
    this.allInteractions = [];
    this.userCategories = []; // New property for custom categories

    this.init();
  }

  async init() {
    console.log('Dashboard initialized');

    // Load data
    await this.loadUserCategories(); // Load custom categories
    await this.loadCategories();
    await this.loadContent();

    // Setup event listeners
    this.setupEventListeners();

    // Check if settings hash is present
    if (window.location.hash === '#settings') {
      this.showSettingsModal();
    }
  }

  /**
   * Load user-defined categories
   */
  async loadUserCategories() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_USER_CATEGORIES' });
      if (response && response.success) {
        this.userCategories = response.data;
        this.renderCustomCategories(); // Render in settings modal
      }
    } catch (error) {
      console.error('Error loading user categories:', error);
      this.userCategories = [];
    }
  }

  /**
   * Load categories from saved content
   */
  async loadCategories() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' });

      if (response && response.success) {
        const categories = response.data;
        // Combine AI-extracted categories with user-defined categories for main filter
        const allCategories = [...new Set([...categories, ...this.userCategories])].sort();
        this.renderCategories(allCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  /**
   * Render categories list
   */
  renderCategories(categories) {
    const listElement = document.getElementById('category-list');

    // Keep "All Categories" option
    listElement.innerHTML = '<li data-category="all" class="active">All Categories</li>';

    categories.forEach(category => {
      const li = document.createElement('li');
      li.dataset.category = category;
      li.textContent = category;
      listElement.appendChild(li);
    });
  }

  /**
   * Load content
   */
  async loadContent() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_INTERACTIONS',
        filters: {}
      });

      if (response && response.success) {
        this.allInteractions = response.data;
        this.filterAndDisplayContent();
      }
    } catch (error) {
      console.error('Error loading content:', error);
      this.renderEmptyState();
    }
  }

  /**
   * Filter and display content
   */
  filterAndDisplayContent() {
    let filtered = this.allInteractions;

    // Apply platform filter
    if (this.currentFilters.platform !== 'all') {
      filtered = filtered.filter(item => item.platform === this.currentFilters.platform);
    }

    // Apply category filter
    if (this.currentFilters.category !== 'all') {
      filtered = filtered.filter(item =>
        item.categories && item.categories.includes(this.currentFilters.category)
      );
    }

    // Apply search filter
    if (this.currentFilters.search) {
      const searchLower = this.currentFilters.search.toLowerCase();
      filtered = filtered.filter(item => {
        const textMatch = item.content.text?.toLowerCase().includes(searchLower);
        const authorMatch = item.metadata.author?.toLowerCase().includes(searchLower);
        return textMatch || authorMatch;
      });
    }

    // Sort
    filtered = this.sortContent(filtered);

    // Display
    this.renderContent(filtered);
  }

  /**
   * Sort content
   */
  sortContent(items) {
    const sortFunctions = {
      'date-desc': (a, b) => b.timestamp - a.timestamp,
      'date-asc': (a, b) => a.timestamp - b.timestamp,
      'engagement': (a, b) => {
        const engA = (a.metadata.likes || 0) + (a.metadata.comments || 0);
        const engB = (b.metadata.likes || 0) + (b.metadata.comments || 0);
        return engB - engA;
      },
      'duration': (a, b) => (b.viewDuration || 0) - (a.viewDuration || 0)
    };

    return items.sort(sortFunctions[this.currentFilters.sort]);
  }

  /**
   * Render content
   */
  renderContent(items) {
    const contentArea = document.getElementById('content-area');

    if (!items || items.length === 0) {
      contentArea.innerHTML = '<div class="empty-state">No content found matching your filters</div>';
      return;
    }

    const containerClass = this.viewMode === 'grid' ? 'content-grid' : 'content-list';
    contentArea.innerHTML = `<div class="${containerClass}" id="content-container"></div>`;

    const container = document.getElementById('content-container');

    items.forEach(item => {
      const card = this.createContentCard(item);
      container.appendChild(card);
    });
  }

  /**
   * Create content card
   */
  createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.dataset.id = item.id;

    // Image (if available)
    if (item.content.imageUrls && item.content.imageUrls.length > 0) {
      const img = document.createElement('img');
      img.className = 'content-card-image';
      img.src = item.content.imageUrls[0];
      img.alt = 'Post image';
      card.appendChild(img);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'content-card-body';

    // Header
    const header = document.createElement('div');
    header.className = 'content-card-header';

    const badge = document.createElement('span');
    badge.className = `platform-badge ${item.platform}`;
    badge.textContent = item.platform;

    const author = document.createElement('span');
    author.className = 'content-card-author';
    author.textContent = item.metadata.author || 'Unknown';

    header.appendChild(badge);
    header.appendChild(author);

    // Text
    const text = document.createElement('div');
    text.className = 'content-card-text';
    text.textContent = item.content.text || 'No text content';

    // Categories section with edit capability
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'content-card-categories-container';

    const categories = document.createElement('div');
    categories.className = 'content-card-categories';

    // Check if categories are real or just "Uncategorized"
    const hasRealCategories = item.categories &&
      item.categories.length > 0 &&
      !(item.categories.length === 1 && item.categories[0] === 'Uncategorized');

    if (hasRealCategories) {
      item.categories.forEach(cat => {
        if (cat !== 'Uncategorized') {
          const tag = document.createElement('span');
          tag.className = 'category-tag';
          tag.textContent = cat;
          categories.appendChild(tag);
        }
      });
    } else {
      const noCategories = document.createElement('span');
      noCategories.className = 'no-categories';
      noCategories.textContent = 'No categories';
      categories.appendChild(noCategories);
    }

    // Edit categories button
    const editCategoriesBtn = document.createElement('button');
    editCategoriesBtn.className = 'btn-edit-categories';
    editCategoriesBtn.textContent = '✏️ Edit';
    editCategoriesBtn.title = 'Edit categories';
    editCategoriesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showEditCategoriesModal(item);
    });

    categoriesContainer.appendChild(categories);
    categoriesContainer.appendChild(editCategoriesBtn);

    // AI Status indicator (shows failure reason if present)
    // "Uncategorized" is treated as a failure, not success
    const aiStatus = document.createElement('div');
    aiStatus.className = 'content-card-ai-status';

    const isUncategorized = item.categories &&
      item.categories.length === 1 &&
      item.categories[0] === 'Uncategorized';

    if (item.aiProcessed === false && item.aiFailureReason) {
      // Show failure indicator with reason
      aiStatus.classList.add('ai-status-failed');
      aiStatus.innerHTML = `
        <span class="ai-status-icon">⚠️</span>
        <span class="ai-status-text">AI categorization failed</span>
        <span class="ai-status-reason" title="${item.aiFailureReason}">${this.truncateText(item.aiFailureReason, 50)}</span>
      `;
    } else if (isUncategorized) {
      // "Uncategorized" means AI didn't work properly - show as failed
      aiStatus.classList.add('ai-status-failed');
      aiStatus.innerHTML = `
        <span class="ai-status-icon">⚠️</span>
        <span class="ai-status-text">AI categorization failed</span>
        <span class="ai-status-reason">${item.aiFailureReason || 'No API key or could not determine categories'}</span>
      `;
    } else if (item.aiProcessed === true && hasRealCategories) {
      // Show success indicator only if we have real categories
      aiStatus.classList.add('ai-status-success');
      aiStatus.innerHTML = `
        <span class="ai-status-icon">✓</span>
        <span class="ai-status-text">AI categorized</span>
      `;
    } else if (!item.aiProcessed && !item.aiFailureReason) {
      // Pending status
      aiStatus.classList.add('ai-status-pending');
      aiStatus.innerHTML = `
        <span class="ai-status-icon">⏳</span>
        <span class="ai-status-text">AI categorization pending</span>
      `;
    } else {
      // Manual categories (no AI)
      aiStatus.classList.add('ai-status-manual');
      aiStatus.innerHTML = `
        <span class="ai-status-icon">👤</span>
        <span class="ai-status-text">Manually categorized</span>
      `;
    }

    // Metadata
    const meta = document.createElement('div');
    meta.className = 'content-card-meta';

    const date = document.createElement('span');
    date.textContent = this.formatDate(item.timestamp);

    const engagement = document.createElement('span');
    engagement.textContent = `${item.metadata.likes || 0} likes • ${item.metadata.comments || 0} comments`;

    meta.appendChild(date);
    meta.appendChild(engagement);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'content-card-actions';

    const openBtn = document.createElement('button');
    openBtn.className = 'btn-card-action';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: item.content.url });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-card-action delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this saved content?')) {
        await this.deleteItem(item.id);
      }
    });

    actions.appendChild(openBtn);
    actions.appendChild(deleteBtn);

    // Assemble
    body.appendChild(header);
    body.appendChild(text);
    body.appendChild(categoriesContainer);
    body.appendChild(aiStatus);
    body.appendChild(meta);
    body.appendChild(actions);

    card.appendChild(body);

    // Click to open
    card.addEventListener('click', () => {
      chrome.tabs.create({ url: item.content.url });
    });

    return card;
  }

  /**
   * Delete item
   */
  async deleteItem(id) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_INTERACTION',
        id: id
      });

      if (response && response.success) {
        // Reload content
        await this.loadContent();
        await this.loadCategories();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<div class="empty-state">No saved content yet.<br>Start browsing social media!</div>';
  }

  /**
   * Format date
   */
  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Truncate text to a maximum length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Show edit categories modal for an item
   * @param {Object} item - The interaction item to edit
   */
  showEditCategoriesModal(item) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('edit-categories-modal');
    if (!modal) {
      modal = this.createEditCategoriesModal();
      document.body.appendChild(modal);
    }

    // Store current item ID
    this.editingItemId = item.id;

    // Get current categories (filter out "Uncategorized")
    const currentCategories = (item.categories || []).filter(c => c !== 'Uncategorized');

    // Populate the modal
    const tagsContainer = document.getElementById('edit-categories-tags');
    tagsContainer.innerHTML = '';

    currentCategories.forEach(cat => {
      this.addCategoryTag(tagsContainer, cat);
    });

    // Clear input
    document.getElementById('edit-category-input').value = '';

    // Populate suggested categories dropdown
    this.populateSuggestedCategories();

    // Show modal
    modal.classList.remove('hidden');
  }

  /**
   * Create the edit categories modal
   */
  createEditCategoriesModal() {
    const modal = document.createElement('div');
    modal.id = 'edit-categories-modal';
    modal.className = 'modal hidden';

    modal.innerHTML = `
      <div class="modal-content modal-content-small">
        <div class="modal-header">
          <h2>Edit Categories</h2>
          <button class="btn-close" id="close-edit-categories">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Current Categories</label>
            <div id="edit-categories-tags" class="edit-categories-tags"></div>
          </div>
          
          <div class="form-group">
            <label>Add Category</label>
            <div class="category-add-inline">
              <input type="text" id="edit-category-input" placeholder="Type a category name...">
              <button id="add-edit-category-btn" class="btn-primary">Add</button>
            </div>
          </div>
          
          <div class="form-group">
            <label>Suggested Categories</label>
            <div id="suggested-categories" class="suggested-categories"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="save-edit-categories" class="btn-primary">Save Changes</button>
          <button id="cancel-edit-categories" class="btn-secondary">Cancel</button>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector('#close-edit-categories').addEventListener('click', () => this.hideEditCategoriesModal());
    modal.querySelector('#cancel-edit-categories').addEventListener('click', () => this.hideEditCategoriesModal());
    modal.querySelector('#save-edit-categories').addEventListener('click', () => this.saveEditedCategories());
    modal.querySelector('#add-edit-category-btn').addEventListener('click', () => this.addNewEditCategory());
    modal.querySelector('#edit-category-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addNewEditCategory();
      }
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideEditCategoriesModal();
      }
    });

    return modal;
  }

  /**
   * Add a category tag to the container
   */
  addCategoryTag(container, categoryName) {
    const tag = document.createElement('span');
    tag.className = 'editable-category-tag';
    tag.innerHTML = `
      ${categoryName}
      <button class="remove-tag-btn" title="Remove">&times;</button>
    `;
    tag.dataset.category = categoryName;

    tag.querySelector('.remove-tag-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      tag.remove();
    });

    container.appendChild(tag);
  }

  /**
   * Populate suggested categories
   */
  populateSuggestedCategories() {
    const container = document.getElementById('suggested-categories');
    container.innerHTML = '';

    // Common categories
    const suggestions = [
      'Technology', 'Business', 'Health', 'Entertainment', 'Sports',
      'News', 'Education', 'Travel', 'Food', 'Fashion', 'Art', 'Music',
      'Gaming', 'Finance', 'Science', 'Lifestyle', 'Humor', 'Motivation'
    ];

    // Also add user-defined categories
    const allSuggestions = [...new Set([...suggestions, ...this.userCategories])].sort();

    allSuggestions.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'suggested-category-btn';
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        const tagsContainer = document.getElementById('edit-categories-tags');
        // Check if already exists
        const existing = tagsContainer.querySelector(`[data-category="${cat}"]`);
        if (!existing) {
          this.addCategoryTag(tagsContainer, cat);
        }
      });
      container.appendChild(btn);
    });
  }

  /**
   * Add a new category from input
   */
  addNewEditCategory() {
    const input = document.getElementById('edit-category-input');
    const categoryName = input.value.trim();

    if (categoryName) {
      const tagsContainer = document.getElementById('edit-categories-tags');
      // Check if already exists
      const existing = tagsContainer.querySelector(`[data-category="${categoryName}"]`);
      if (!existing) {
        this.addCategoryTag(tagsContainer, categoryName);
      }
      input.value = '';
    }
  }

  /**
   * Hide the edit categories modal
   */
  hideEditCategoriesModal() {
    const modal = document.getElementById('edit-categories-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.editingItemId = null;
  }

  /**
   * Save edited categories
   */
  async saveEditedCategories() {
    if (!this.editingItemId) return;

    const tagsContainer = document.getElementById('edit-categories-tags');
    const tags = tagsContainer.querySelectorAll('.editable-category-tag');
    const categories = Array.from(tags).map(tag => tag.dataset.category);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_INTERACTION',
        id: this.editingItemId,
        updates: {
          categories: categories.length > 0 ? categories : ['Uncategorized'],
          // Mark as manually edited if user made changes
          manuallyEdited: true
        }
      });

      if (response && response.success) {
        this.hideEditCategoriesModal();
        await this.loadContent(); // Reload to show updated categories
        await this.loadCategories(); // Reload category filter
      } else {
        alert('Failed to save categories');
      }
    } catch (error) {
      console.error('Error saving categories:', error);
      alert('Error saving categories');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Platform filter
    document.querySelectorAll('.platform-list li').forEach(li => {
      li.addEventListener('click', (e) => {
        document.querySelector('.platform-list li.active')?.classList.remove('active');
        e.target.classList.add('active');
        this.currentFilters.platform = e.target.dataset.platform;
        this.filterAndDisplayContent();
      });
    });

    // Category filter (delegated)
    document.getElementById('category-list').addEventListener('click', (e) => {
      if (e.target.tagName === 'LI') {
        document.querySelector('.category-list li.active')?.classList.remove('active');
        e.target.classList.add('active');
        this.currentFilters.category = e.target.dataset.category;
        this.filterAndDisplayContent();
      }
    });

    // Search
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentFilters.search = e.target.value;
        this.filterAndDisplayContent();
      }, 300);
    });

    // Sort
    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.currentFilters.sort = e.target.value;
      this.filterAndDisplayContent();
    });

    // View toggle
    document.getElementById('view-toggle').addEventListener('click', (e) => {
      this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
      e.target.textContent = this.viewMode === 'grid' ? 'Grid View' : 'List View';
      this.filterAndDisplayContent();
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportData();
    });

    // Settings modal
    document.getElementById('close-settings').addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('cancel-settings').addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Custom category management
    document.getElementById('add-category-btn').addEventListener('click', () => this.addCustomCategory());
    document.getElementById('new-category-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addCustomCategory();
      }
    });
  }

  /**
   * Show settings modal
   */
  async showSettingsModal() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

      if (response && response.success) {
        const settings = response.data;

        // Populate form - new settings structure
        document.getElementById('openai-api-key').value = settings.openaiApiKey || '';
        document.getElementById('gemini-api-key').value = settings.geminiApiKey || '';

        // Backward compatibility: migrate existing settings if present
        if (!settings.openaiApiKey && !settings.geminiApiKey && settings.apiKey) {
          if (settings.aiProvider === 'openai') {
            document.getElementById('openai-api-key').value = settings.apiKey;
          } else if (settings.aiProvider === 'gemini') {
            document.getElementById('gemini-api-key').value = settings.apiKey;
          }
        }

        // Legacy fields (hidden)
        document.getElementById('ai-provider').value = settings.aiProvider || 'openai';
        document.getElementById('api-key').value = settings.apiKey || '';

        document.getElementById('time-threshold').value = (settings.autoSaveTimeThreshold || 5000) / 1000;
        document.getElementById('enable-instagram').checked = settings.enabledPlatforms?.instagram !== false;
        document.getElementById('enable-twitter').checked = settings.enabledPlatforms?.twitter !== false;
        document.getElementById('enable-linkedin').checked = settings.enabledPlatforms?.linkedin !== false;
        document.getElementById('enable-tiktok').checked = settings.enabledPlatforms?.tiktok !== false;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    document.getElementById('settings-modal').classList.remove('hidden');

    // Load and render custom categories
    await this.loadUserCategories();
  }

  /**
   * Render custom categories in the settings modal
   */
  renderCustomCategories() {
    const listElement = document.getElementById('custom-categories-list');
    listElement.innerHTML = ''; // Clear existing list

    if (this.userCategories.length === 0) {
      listElement.innerHTML = '<div class="empty-state-small">No custom categories yet.</div>';
      return;
    }

    this.userCategories.forEach((category, index) => {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'category-edit-item';
      categoryElement.dataset.index = index;

      categoryElement.innerHTML = `
        <input type="text" value="${category}" class="category-edit-input" data-original="${category}">
        <button class="btn-icon btn-save-category" title="Save"><svg fill="currentColor" viewBox="0 0 20 20"><path d="M5.433 13.917l1.262-3.155A4 4 0 0110 9.475V6H4.668a1 1 0 00-.464.116l-.897.448S3 7 3 7.5V17a1 1 0 001 1h4.259a1 1 0 00.945-.66L13.565 8.163v1.894l-1.57 3.926c-.365.913-.807 1.258-1.076 1.344a.25.25 0 01-.137.012H8.35a.75.75 0 01-.645-1.127l1.045-2.613a.25.25 0 00-.137-.342H5.433zm9.637-2.073l1.262-3.155A4 4 0 0110 9.475V6h-.066a1 1 0 00-.464.116l-.897.448S3 7 3 7.5V17a1 1 0 001 1h4.259a1 1 0 00.945-.66L13.565 8.163v1.894l-1.57 3.926c-.365.913-.807 1.258-1.076 1.344a.25.25 0 01-.137.012H8.35a.75.75 0 01-.645-1.127l1.045-2.613a.25.25 0 00-.137-.342H5.433z"></path></svg></button>
        <button class="btn-icon btn-delete-category" title="Delete"><svg fill="currentColor" viewBox="0 0 20 20"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"></path></svg></button>
      `;
      listElement.appendChild(categoryElement);
    });

    // Attach event listeners for edit and delete buttons after rendering
    listElement.querySelectorAll('.btn-save-category').forEach(button => {
      button.addEventListener('click', (e) => this.editCustomCategory(e));
    });
    listElement.querySelectorAll('.btn-delete-category').forEach(button => {
      button.addEventListener('click', (e) => this.deleteCustomCategory(e));
    });
  }

  /**
   * Hide settings modal
   */
  hideSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  /**
   * Save settings
   */
  async saveSettings() {
    const settings = {
      // New settings structure
      openaiApiKey: document.getElementById('openai-api-key').value.trim(),
      geminiApiKey: document.getElementById('gemini-api-key').value.trim(),
      // Legacy fields for backward compatibility
      aiProvider: document.getElementById('ai-provider').value,
      apiKey: document.getElementById('api-key').value.trim(),
      autoSaveTimeThreshold: parseInt(document.getElementById('time-threshold').value) * 1000,
      enabledPlatforms: {
        instagram: document.getElementById('enable-instagram').checked,
        twitter: document.getElementById('enable-twitter').checked,
        linkedin: document.getElementById('enable-linkedin').checked,
        tiktok: document.getElementById('enable-tiktok').checked
      },
      // Custom categories
      userCategories: this.userCategories
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        updates: settings
      });

      if (response && response.success) {
        alert('Settings saved successfully!');
        this.hideSettingsModal();
        this.loadCategories(); // Reload main category filter to include custom categories
      } else {
        console.error('Failed to save settings:', response.error);
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  }

  /**
   * Add a new custom category
   */
  async addCustomCategory() {
    const inputElement = document.getElementById('new-category-input');
    const newCategory = inputElement.value.trim();

    if (newCategory && !this.userCategories.includes(newCategory)) {
      this.userCategories.push(newCategory);
      inputElement.value = ''; // Clear input
      await this.saveUserCategories(); // Save to storage
      this.renderCustomCategories(); // Re-render list
    } else if (this.userCategories.includes(newCategory)) {
      alert('Category already exists!');
    }
  }

  /**
   * Edit an existing custom category
   */
  async editCustomCategory(event) {
    const categoryElement = event.target.closest('.category-edit-item');
    const index = parseInt(categoryElement.dataset.index);
    const input = categoryElement.querySelector('.category-edit-input');
    const newName = input.value.trim();
    const originalName = input.dataset.original;

    if (newName && newName !== originalName) {
      if (this.userCategories.includes(newName)) {
        alert('Category with this name already exists!');
        input.value = originalName; // Revert to original
        return;
      }
      this.userCategories[index] = newName;
      await this.saveUserCategories();
      this.renderCustomCategories();
      alert('Category updated!');
    } else {
      input.value = originalName; // Revert to original if empty or no change
    }
  }

  /**
   * Delete a custom category
   */
  async deleteCustomCategory(event) {
    const categoryElement = event.target.closest('.category-edit-item');
    const index = parseInt(categoryElement.dataset.index);
    const categoryName = this.userCategories[index];

    if (confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      this.userCategories.splice(index, 1);
      await this.saveUserCategories();
      this.renderCustomCategories();
      alert('Category deleted!');
    }
  }

  /**
   * Save user categories to storage
   */
  async saveUserCategories() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_CATEGORIES',
        categories: this.userCategories
      });
      if (!response.success) {
        console.error('Failed to save user categories:', response.error);
        alert('Failed to save custom categories.');
      }
    } catch (error) {
      console.error('Error saving user categories:', error);
      alert('Error saving custom categories.');
    }
  }

  /**
   * Export data
   */
  async exportData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });

      if (response && response.success) {
        // Convert base64 to blob
        const base64 = response.data.split(',')[1];
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: 'application/json' });

        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `content-tracker-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        alert('Data exported successfully!');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager();
});
