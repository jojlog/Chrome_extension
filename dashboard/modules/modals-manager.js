import { PREDEFINED_CATEGORIES } from '../../lib/constants.js';
import { CategorySelector } from './category-selector.js';

/**
 * Modals Manager - Handles settings and edit dialogs
 */
export class ModalsManager {
    constructor(dashboardManager) {
        this.dashboardManager = dashboardManager;
        this.activeEditItem = null;
        this.categorySelector = null;
        this.setupModalListeners();
    }

    setupModalListeners() {
        // Settings Modal
        document.getElementById('close-settings')?.addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('cancel-settings')?.addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('save-settings')?.addEventListener('click', () => this.saveSettings());

        // Custom Category Management
        document.getElementById('add-category-btn')?.addEventListener('click', () => this.addCustomCategory());

        // Close on outside click
        window.addEventListener('click', (e) => {
            const settingsModal = document.getElementById('settings-modal');
            const editModal = document.getElementById('edit-categories-modal');

            if (e.target === settingsModal) this.hideSettingsModal();
            if (e.target === editModal) this.hideEditCategoriesModal();
        });
    }

    // --- Settings Modal ---

    showSettingsModal(settings, userCategories, userAccounts) {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        // Populate fields
        if (settings.openaiApiKey) document.getElementById('openai-api-key').value = settings.openaiApiKey;
        if (settings.geminiApiKey) document.getElementById('gemini-api-key').value = settings.geminiApiKey;
        if (settings.autoSaveTimeThreshold) document.getElementById('time-threshold').value = settings.autoSaveTimeThreshold / 1000;

        // Platforms
        if (settings.enabledPlatforms) {
            document.getElementById('enable-instagram').checked = settings.enabledPlatforms.instagram !== false;
            document.getElementById('enable-threads').checked = settings.enabledPlatforms.threads !== false;
            document.getElementById('enable-twitter').checked = settings.enabledPlatforms.twitter !== false;
            document.getElementById('enable-linkedin').checked = settings.enabledPlatforms.linkedin !== false;
            document.getElementById('enable-tiktok').checked = settings.enabledPlatforms.tiktok !== false;
        }
        document.getElementById('auto-import-saved').checked = settings.autoImportSavedPages === true;
        document.getElementById('suppress-import-notifications').checked = settings.suppressImportNotifications !== false;
        document.getElementById('skip-ai-for-imports').checked = settings.skipAIForImports !== false;

        this.renderCustomCategories(userCategories);

        // Render accounts
        if (this.dashboardManager.accountsManager) {
            this.dashboardManager.accountsManager.renderAccountsList(userAccounts);
        }

        modal.classList.remove('hidden');
    }

    async refreshSettings() {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
        const accountsResponse = await chrome.runtime.sendMessage({ type: 'GET_USER_ACCOUNTS' });
        const categories = await this.dashboardManager.storage.getUserCategories();

        if (response && response.success) {
            this.showSettingsModal(response.data, categories, accountsResponse.data || {});
        }
    }

    hideSettingsModal() {
        document.getElementById('settings-modal')?.classList.add('hidden');
    }

    async saveSettings() {
        const updates = {
            openaiApiKey: document.getElementById('openai-api-key').value.trim(),
            geminiApiKey: document.getElementById('gemini-api-key').value.trim(),
            autoSaveTimeThreshold: parseInt(document.getElementById('time-threshold').value) * 1000,
            enabledPlatforms: {
                instagram: document.getElementById('enable-instagram').checked,
                threads: document.getElementById('enable-threads').checked,
                twitter: document.getElementById('enable-twitter').checked,
                linkedin: document.getElementById('enable-linkedin').checked,
                tiktok: document.getElementById('enable-tiktok').checked
            },
            autoImportSavedPages: document.getElementById('auto-import-saved').checked,
            suppressImportNotifications: document.getElementById('suppress-import-notifications').checked,
            skipAIForImports: document.getElementById('skip-ai-for-imports').checked
        };

        await this.dashboardManager.saveSettings(updates);
        this.hideSettingsModal();
    }

    renderCustomCategories(categories) {
        const container = document.getElementById('custom-categories-list');
        if (!container) return;

        container.innerHTML = '';
        categories.forEach(cat => {
            const el = document.createElement('div');
            el.className = 'category-edit-item';

            const span = document.createElement('span');
            span.textContent = cat;

            const actions = document.createElement('div');

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '&times;';
            delBtn.className = 'btn-icon delete-cat';
            delBtn.onclick = () => this.dashboardManager.deleteCustomCategory(cat);

            actions.appendChild(delBtn);
            el.appendChild(span);
            el.appendChild(actions);
            container.appendChild(el);
        });
    }

    async addCustomCategory() {
        const input = document.getElementById('new-category-input');
        const name = input.value.trim();
        if (name) {
            await this.dashboardManager.addCustomCategory(name);
            input.value = '';
        }
    }

    // --- Edit Categories Modal ---

    createEditCategoriesModal() {
        if (document.getElementById('edit-categories-modal')) return;

        const modalHtml = `
      <div id="edit-categories-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Edit Categories</h2>
            <button id="close-edit-cats" class="btn-close">&times;</button>
          </div>
          <div class="modal-body">
            <label class="form-label">Current Categories</label>
            <div class="current-tags" id="edit-modal-tags"></div>
            
            <label class="form-label">Add Category</label>
            <div id="category-selector-container"></div>
            
            <div class="suggested-tags">
              <h4>Frequently Used</h4>
              <div id="suggested-tags-list" class="tags-cloud"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="save-edit-cats" class="btn-primary">Save</button>
            <button id="cancel-edit-cats" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Bind events
        document.getElementById('close-edit-cats').onclick = () => this.hideEditCategoriesModal();
        document.getElementById('cancel-edit-cats').onclick = () => this.hideEditCategoriesModal();
        document.getElementById('save-edit-cats').onclick = () => this.saveEditedCategories();

        // Initialize CategorySelector
        const selectorContainer = document.getElementById('category-selector-container');
        this.categorySelector = new CategorySelector({
            container: selectorContainer,
            placeholder: 'Search or type new category...',
            showUsageCount: true,
            onSelect: (category) => {
                this.addCategoryTag(document.getElementById('edit-modal-tags'), category.name);
                this.updateSuggestionsVisibility();
            },
            onCreateNew: async (category) => {
                // Save new category to user categories
                await this.dashboardManager.ensureUserCategory(category.name);
            }
        });
    }

    async showEditCategoriesModal(item, userCategories) {
        this.createEditCategoriesModal();
        this.activeEditItem = item;
        this.activeEditItems = null;

        const modal = document.getElementById('edit-categories-modal');
        const title = modal.querySelector('.modal-header h2');
        if (title) title.textContent = 'Edit Categories';

        const tagsContainer = document.getElementById('edit-modal-tags');
        tagsContainer.innerHTML = '';

        // Render current categories
        const currentCats = item.categories || [];
        currentCats.forEach(cat => this.addCategoryTag(tagsContainer, cat));

        // Get categories with usage counts for the selector
        let categoriesWithUsage = [];
        try {
            categoriesWithUsage = await this.dashboardManager.storage.getCategoriesWithUsage();
        } catch (e) {
            // Fallback to simple list
            const allCats = [...new Set([...PREDEFINED_CATEGORIES, ...userCategories])];
            categoriesWithUsage = allCats.map(name => ({ name, usageCount: 0 }));
        }

        // Filter out already selected categories for selector
        const availableCategories = categoriesWithUsage.filter(cat => !currentCats.includes(cat.name));

        // Update the CategorySelector
        if (this.categorySelector) {
            this.categorySelector.setCategories(availableCategories);
            this.categorySelector.clear();
        }

        // Render top suggestions (most used categories not already selected)
        const suggestionsContainer = document.getElementById('suggested-tags-list');
        suggestionsContainer.innerHTML = '';

        const topSuggestions = categoriesWithUsage
            .filter(cat => !currentCats.includes(cat.name) && cat.usageCount > 0)
            .slice(0, 15);

        topSuggestions.forEach(cat => {
            const tag = document.createElement('span');
            tag.className = 'suggested-tag';
            tag.textContent = cat.usageCount > 0 ? `${cat.name} (${cat.usageCount})` : cat.name;
            tag.dataset.name = cat.name;
            tag.onclick = () => {
                this.addCategoryTag(tagsContainer, cat.name);
                tag.remove();
                this.updateSuggestionsVisibility();
            };
            suggestionsContainer.appendChild(tag);
        });

        this.updateSuggestionsVisibility();
        modal.classList.remove('hidden');
    }

    /**
     * Update suggestions section visibility based on available items
     */
    updateSuggestionsVisibility() {
        const suggestionsContainer = document.getElementById('suggested-tags-list');
        const suggestionsSection = suggestionsContainer?.closest('.suggested-tags');
        if (suggestionsSection) {
            suggestionsSection.style.display = suggestionsContainer.children.length > 0 ? 'block' : 'none';
        }
    }

    addCategoryTag(container, name) {
        // Check duplicates
        if ([...container.children].some(el => el.dataset.val === name)) return;
        if (container.children.length >= 3) {
            alert('Each item can have up to 3 categories.');
            return;
        }

        const span = document.createElement('span');
        span.className = 'category-tag editable';
        span.textContent = name;
        span.dataset.val = name;

        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-tag';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => {
            span.remove();
            // Re-add to suggestions if applicable
            this.updateSuggestionsVisibility();
        };

        span.appendChild(removeBtn);
        container.appendChild(span);
    }

    hideEditCategoriesModal() {
        document.getElementById('edit-categories-modal')?.classList.add('hidden');
        this.activeEditItem = null;
        this.activeEditItems = null;
    }

    async saveEditedCategories() {
        const container = document.getElementById('edit-modal-tags');
        const newCategories = [...container.children].map(el => el.dataset.val);

        if (this.activeEditItem) {
            // Single Item Edit
            await this.dashboardManager.updateItemCategories(this.activeEditItem.id, newCategories);
        } else if (this.activeEditItems && this.activeEditItems.length > 0) {
            // Bulk Edit
            await this.dashboardManager.bulkUpdateCategories(this.activeEditItems, newCategories, 'replace');
        }

        this.hideEditCategoriesModal();
    }

    async showBulkEditCategoriesModal(itemIds, userCategories) {
        this.createEditCategoriesModal();
        this.activeEditItem = null;
        this.activeEditItems = itemIds;

        const modal = document.getElementById('edit-categories-modal');
        const title = modal.querySelector('.modal-header h2');
        if (title) title.textContent = `Bulk Edit (${itemIds.length} items)`;

        const tagsContainer = document.getElementById('edit-modal-tags');
        tagsContainer.innerHTML = '';

        // For bulk edit, we start empty (Replace mode) or we could calculate intersection
        // Starting empty is safer for 'Replace' mode

        // Get categories with usage counts for the selector
        let categoriesWithUsage = [];
        try {
            categoriesWithUsage = await this.dashboardManager.storage.getCategoriesWithUsage();
        } catch (e) {
            const allCats = [...new Set([...PREDEFINED_CATEGORIES, ...userCategories])];
            categoriesWithUsage = allCats.map(name => ({ name, usageCount: 0 }));
        }

        // Update the CategorySelector
        if (this.categorySelector) {
            this.categorySelector.setCategories(categoriesWithUsage);
            this.categorySelector.clear();
        }

        // Render top suggestions
        const suggestionsContainer = document.getElementById('suggested-tags-list');
        suggestionsContainer.innerHTML = '';

        const topSuggestions = categoriesWithUsage
            .filter(cat => cat.usageCount > 0)
            .slice(0, 15);

        topSuggestions.forEach(cat => {
            const tag = document.createElement('span');
            tag.className = 'suggested-tag';
            tag.textContent = cat.usageCount > 0 ? `${cat.name} (${cat.usageCount})` : cat.name;
            tag.dataset.name = cat.name;
            tag.onclick = () => {
                this.addCategoryTag(tagsContainer, cat.name);
                // Don't remove from suggestions in bulk mode as it might be re-added
                this.updateSuggestionsVisibility();
            };
            suggestionsContainer.appendChild(tag);
        });

        this.updateSuggestionsVisibility();
        modal.classList.remove('hidden');
    }
}
