/**
 * Category Selector Component
 * A reusable dropdown/autocomplete component for selecting and creating categories
 */

export class CategorySelector {
    constructor(options = {}) {
        this.container = options.container;
        this.onSelect = options.onSelect || (() => { });
        this.onCreateNew = options.onCreateNew || (() => { });
        this.placeholder = options.placeholder || 'Search or add category...';
        this.showUsageCount = options.showUsageCount !== false;

        this.categories = [];
        this.filteredCategories = [];
        this.selectedIndex = -1;
        this.isOpen = false;

        this.inputEl = null;
        this.dropdownEl = null;
        this.element = null;

        if (this.container) {
            this.render();
        }
    }

    /**
     * Set categories data
     * @param {Array<{name: string, usageCount: number, isUserDefined?: boolean}>} categories
     */
    setCategories(categories) {
        this.categories = categories || [];
        this.filteredCategories = [...this.categories];
        this.updateDropdown();
    }

    /**
     * Render the component
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = 'category-selector';

        const wrapper = document.createElement('div');
        wrapper.className = 'category-input-wrapper';

        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.className = 'category-selector-input';
        this.inputEl.placeholder = this.placeholder;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'category-selector-toggle';
        toggleBtn.innerHTML = '▼';
        toggleBtn.tabIndex = -1; // Prevent tab focus
        toggleBtn.type = 'button';

        toggleBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.isOpen) {
                this.close();
            } else {
                this.inputEl.focus();
                // open() is called by focus listener
            }
        };

        wrapper.appendChild(this.inputEl);
        wrapper.appendChild(toggleBtn);
        this.element.appendChild(wrapper);

        this.dropdownEl = document.createElement('div');
        this.dropdownEl.className = 'category-selector-dropdown hidden';

        this.element.appendChild(this.dropdownEl);

        this.attachEvents();

        if (this.container) {
            this.container.appendChild(this.element);
        }

        return this.element;
    }

    /**
     * Attach event listeners
     */
    attachEvents() {
        // Input focus - show dropdown
        this.inputEl.addEventListener('focus', () => {
            this.open();
        });

        // Input blur - hide dropdown (with delay for click to register)
        this.inputEl.addEventListener('blur', () => {
            setTimeout(() => this.close(), 200);
        });

        // Input typing - filter categories
        this.inputEl.addEventListener('input', (e) => {
            this.filterCategories(e.target.value);
        });

        // Keyboard navigation
        this.inputEl.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
    }

    /**
     * Filter categories based on search query
     */
    filterCategories(query) {
        const q = query.toLowerCase().trim();

        if (!q) {
            this.filteredCategories = [...this.categories];
        } else {
            this.filteredCategories = this.categories.filter(cat =>
                cat.name.toLowerCase().includes(q)
            );
        }

        // Sort: exact matches first, then by usage count
        this.filteredCategories.sort((a, b) => {
            const aExact = a.name.toLowerCase() === q;
            const bExact = b.name.toLowerCase() === q;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            return b.usageCount - a.usageCount;
        });

        this.selectedIndex = this.filteredCategories.length > 0 ? 0 : -1;
        this.updateDropdown();
    }

    /**
     * Handle keyboard navigation
     */
    handleKeydown(e) {
        const query = this.inputEl.value.trim();

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!this.isOpen) {
                    this.open();
                } else {
                    this.selectNext();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectPrev();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.filteredCategories[this.selectedIndex]) {
                    this.selectCategory(this.filteredCategories[this.selectedIndex]);
                } else if (query) {
                    // Create new category
                    this.createNewCategory(query);
                }
                break;

            case 'Escape':
                this.close();
                this.inputEl.blur();
                break;
        }
    }

    /**
     * Select next item in dropdown
     */
    selectNext() {
        const maxIndex = this.filteredCategories.length + (this.shouldShowCreateOption() ? 0 : -1);
        if (this.selectedIndex < maxIndex) {
            this.selectedIndex++;
            this.updateSelectedItem();
        }
    }

    /**
     * Select previous item in dropdown
     */
    selectPrev() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateSelectedItem();
        }
    }

    /**
     * Check if "Create new" option should be shown
     */
    shouldShowCreateOption() {
        const query = this.inputEl.value.trim().toLowerCase();
        if (!query) return false;

        // Check if exact match exists
        const exactMatch = this.categories.some(cat =>
            cat.name.toLowerCase() === query
        );
        return !exactMatch;
    }

    /**
     * Update the dropdown content
     */
    updateDropdown() {
        this.dropdownEl.innerHTML = '';

        // Show filtered categories
        this.filteredCategories.forEach((cat, index) => {
            const item = document.createElement('div');
            item.className = 'category-selector-item';
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'category-selector-name';
            nameSpan.textContent = cat.name;
            item.appendChild(nameSpan);

            if (this.showUsageCount && cat.usageCount > 0) {
                const countSpan = document.createElement('span');
                countSpan.className = 'category-selector-count';
                countSpan.textContent = `(${cat.usageCount})`;
                item.appendChild(countSpan);
            }

            if (cat.isUserDefined) {
                const badge = document.createElement('span');
                badge.className = 'category-selector-badge';
                badge.textContent = 'custom';
                item.appendChild(badge);
            }

            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.selectCategory(cat);
            });

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelectedItem();
            });

            this.dropdownEl.appendChild(item);
        });

        // Show "Create new" option if applicable
        if (this.shouldShowCreateOption()) {
            const createItem = document.createElement('div');
            createItem.className = 'category-selector-create';

            const query = this.inputEl.value.trim();
            createItem.innerHTML = `<span class="create-icon">+</span> Create "<strong>${this.escapeHtml(query)}</strong>"`;

            if (this.selectedIndex === this.filteredCategories.length) {
                createItem.classList.add('selected');
            }

            createItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.createNewCategory(query);
            });

            createItem.addEventListener('mouseenter', () => {
                this.selectedIndex = this.filteredCategories.length;
                this.updateSelectedItem();
            });

            this.dropdownEl.appendChild(createItem);
        }

        // Empty state
        if (this.filteredCategories.length === 0 && !this.shouldShowCreateOption()) {
            const empty = document.createElement('div');
            empty.className = 'category-selector-empty';
            empty.textContent = 'No categories found. Type to create new.';
            this.dropdownEl.appendChild(empty);
        }
    }

    /**
     * Update visual selection state
     */
    updateSelectedItem() {
        const items = this.dropdownEl.querySelectorAll('.category-selector-item, .category-selector-create');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });

        // Scroll selected item into view
        const selectedItem = this.dropdownEl.querySelector('.selected');
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Select a category
     */
    selectCategory(category) {
        this.inputEl.value = '';
        this.close();
        this.onSelect(category);
    }

    /**
     * Create a new category
     */
    createNewCategory(name) {
        const newCategory = { name, usageCount: 0, isUserDefined: true };
        this.inputEl.value = '';
        this.close();
        this.onCreateNew(newCategory);
        this.onSelect(newCategory);
    }

    /**
     * Open dropdown
     */
    open() {
        this.isOpen = true;
        this.filterCategories(this.inputEl.value);
        this.dropdownEl.classList.remove('hidden');
    }

    /**
     * Close dropdown
     */
    close() {
        this.isOpen = false;
        this.dropdownEl.classList.add('hidden');
        this.selectedIndex = -1;
    }

    /**
     * Clear input
     */
    clear() {
        this.inputEl.value = '';
        this.filteredCategories = [...this.categories];
    }

    /**
     * Focus input
     */
    focus() {
        this.inputEl.focus();
    }

    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
