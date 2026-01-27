import { formatDate, truncateText } from '../../lib/utils.js';

/**
 * Content Renderer - Handles rendering of content items
 */
export class ContentRenderer {
    constructor(dashboardManager) {
        this.dashboardManager = dashboardManager;
    }

    /**
     * Render categories list
     * @param {Array} categories 
     * @param {string} activeCategory 
     */
    renderCategories(categories, activeCategory) {
        const list = document.getElementById('category-list');
        if (!list) return;

        list.innerHTML = '';

        // "All Categories" Item
        const allLi = document.createElement('li');
        allLi.dataset.category = 'all';
        allLi.textContent = 'All Categories';
        if (activeCategory === 'all') allLi.classList.add('active');
        allLi.addEventListener('click', () => {
            this.dashboardManager.setFilter('category', 'all');
        });
        list.appendChild(allLi);

        // Build Tree
        const tree = {};
        categories.forEach(cat => {
            // Ignore "All Categories" if present in list
            if (cat === 'all') return;

            const parts = cat.split('/');
            let current = tree;

            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        name: part,
                        fullPath: parts.slice(0, index + 1).join('/'),
                        children: {},
                        count: 0
                    };
                }
                // Mark if this specific path is an actual category in the list
                // (e.g. "Tech" exists vs just "Tech/AI")
                if (index === parts.length - 1) {
                    current[part].isCategory = true;
                }

                current = current[part].children;
            });
        });

        // Helper to check if node contains active category
        const containsActive = (node) => {
            if (node.fullPath === activeCategory) return true;
            return Object.values(node.children).some(child => containsActive(child));
        };

        // Recursive Render
        const renderTree = (nodes, container, level = 0) => {
            Object.keys(nodes).sort().forEach(key => {
                const node = nodes[key];
                const hasChildren = Object.keys(node.children).length > 0;

                const li = document.createElement('li');
                li.className = 'category-item';
                if (node.fullPath === activeCategory) li.classList.add('active');
                if (hasChildren) li.classList.add('has-children');

                const row = document.createElement('div');
                row.className = 'category-row';
                row.style.paddingLeft = `${20 + (level * 15)}px`; // Indent based on level

                // Toggle Button (if children)
                if (hasChildren) {
                    const toggle = document.createElement('span');
                    toggle.className = 'category-toggle';
                    toggle.innerHTML = '▶'; // Chevron right
                    toggle.onclick = (e) => {
                        e.stopPropagation();
                        li.classList.toggle('expanded');
                        toggle.innerHTML = li.classList.contains('expanded') ? '▼' : '▶';
                    };

                    // Auto-expand if active category is inside
                    if (containsActive(node)) {
                        li.classList.add('expanded');
                        toggle.innerHTML = '▼';
                    }

                    row.appendChild(toggle);
                } else {
                    const spacer = document.createElement('span');
                    spacer.className = 'category-spacer';
                    row.appendChild(spacer);
                }

                const nameSpan = document.createElement('span');
                nameSpan.className = 'category-name';
                nameSpan.textContent = node.name;
                row.appendChild(nameSpan);

                // Row Click - Filter
                row.addEventListener('click', () => {
                    this.dashboardManager.setFilter('category', node.fullPath);
                });

                li.appendChild(row);

                // Render Children
                if (hasChildren) {
                    const childUl = document.createElement('ul');
                    childUl.className = 'category-children';
                    renderTree(node.children, childUl, level + 1);
                    li.appendChild(childUl);
                }

                container.appendChild(li);
            });
        };

        renderTree(tree, list);
    }

    /**
     * Render content items
     * @param {Array} items 
     * @param {string} viewMode 
     * @param {boolean} selectMode
     * @param {Set} selectedItems
     */
    renderContent(items, viewMode, selectMode = false, selectedItems = new Set()) {
        const container = document.getElementById('content-area');
        if (!container) return;

        container.innerHTML = '';
        container.className = 'content-area';

        if (items.length === 0) {
            this.renderEmptyState(container);
            return;
        }

        // Create wrapper with correct class for grid/list layout
        const wrapper = document.createElement('div');
        wrapper.className = viewMode === 'grid' ? 'content-grid' : 'content-list';

        items.forEach(item => {
            const card = this.createContentCard(item, viewMode, selectMode, selectedItems.has(item.id));
            wrapper.appendChild(card);
        });

        container.appendChild(wrapper);
    }

    /**
     * Create a content card element
     * @param {Object} item 
     * @param {string} viewMode
     * @param {boolean} selectMode
     * @param {boolean} isSelected
     * @returns {HTMLElement}
     */
    createContentCard(item, viewMode, selectMode = false, isSelected = false) {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.id = item.id;

        // Add selection classes
        if (selectMode) {
            card.classList.add('selectable');
            if (isSelected) {
                card.classList.add('selected');
            }
        }

        // Add checkbox for selection mode
        const checkbox = document.createElement('div');
        checkbox.className = 'card-checkbox';
        card.appendChild(checkbox);

        // Header: Platform icon + Date + Actions
        const header = document.createElement('div');
        header.className = 'card-header';

        const platformBadge = document.createElement('span');
        platformBadge.className = `platform-badge ${item.platform}`;
        platformBadge.textContent = item.platform;

        const metaInfo = document.createElement('div');
        metaInfo.className = 'meta-info';

        // AI Status Indicator
        const aiStatus = document.createElement('span');
        aiStatus.className = 'ai-status';

        const isUncategorized = item.categories &&
            item.categories.length === 1 &&
            item.categories[0] === 'Uncategorized';

        if (isUncategorized || (item.aiProcessed === false && item.aiFailureReason)) {
            // Failed or Uncategorized
            aiStatus.innerHTML = '<span title="AI categorization failed">⚠️</span>';
            aiStatus.classList.add('ai-failed');
        } else if (item.aiProcessed) {
            // Success
            aiStatus.innerHTML = '<span title="Categorized by AI">✓ AI</span>';
            aiStatus.classList.add('ai-success');
        } else if (item.categories && item.categories.length > 0 && !isUncategorized) {
            // Manual
            aiStatus.innerHTML = '<span title="Manually categorized">👤</span>';
        } else {
            // Pending
            aiStatus.innerHTML = '<span title="Waiting for AI...">⏳</span>';
        }

        const dateSpan = document.createElement('span');
        dateSpan.className = 'date';
        dateSpan.textContent = formatDate(item.timestamp);

        // Action menu
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this item?')) {
                this.dashboardManager.deleteItem(item.id);
            }
        });

        // Edit Categories Button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.title = 'Edit Categories';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dashboardManager.openEditCategoriesModal(item);
        });

        metaInfo.appendChild(aiStatus);
        metaInfo.appendChild(dateSpan);

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        header.appendChild(platformBadge);
        header.appendChild(metaInfo);
        header.appendChild(actions);

        // Body: Content text + Media
        const body = document.createElement('div');
        body.className = 'card-body';

        const text = document.createElement('p');
        text.className = 'content-text';
        const displayText = this.dashboardManager.getDisplayText(item);
        text.textContent = truncateText(displayText, 150);

        body.appendChild(text);

        // Media preview if available
        if (viewMode === 'grid' && (item.content.previewDataUrl || (item.content.imageUrls && item.content.imageUrls.length > 0))) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'media-preview';
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = 'Saved content preview';
            imageContainer.appendChild(img);
            body.appendChild(imageContainer);
            if (item.content.previewDataUrl) {
                img.src = item.content.previewDataUrl;
            } else {
                if (item.platform === 'instagram') {
                    const loadBtn = document.createElement('button');
                    loadBtn.className = 'media-preview-btn';
                    loadBtn.type = 'button';
                    loadBtn.textContent = 'Load preview';
                    loadBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        loadBtn.disabled = true;
                        loadBtn.textContent = 'Loading...';
                        this.dashboardManager.loadImagePreview(img, item);
                        loadBtn.remove();
                    });
                    imageContainer.appendChild(loadBtn);
                } else {
                    this.dashboardManager.loadImagePreview(img, item);
                }
            }
        }

        // Footer: Author + Saved By + Categories
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        const authorSection = document.createElement('div');
        authorSection.className = 'author-section';

        const author = document.createElement('div');
        author.className = 'author';
        author.textContent = item.metadata.author || 'Unknown Author';
        authorSection.appendChild(author);

        // Show savedBy user if available
        if (item.savedBy && item.savedBy.username) {
            const savedBy = document.createElement('div');
            savedBy.className = 'saved-by';
            savedBy.innerHTML = `<span class="saved-by-label">Saved by:</span> @${item.savedBy.username}`;
            if (item.savedBy.fullName) {
                savedBy.title = item.savedBy.fullName;
            }
            authorSection.appendChild(savedBy);
        }

        const categories = document.createElement('div');
        categories.className = 'categories';

        if (item.categories && item.categories.length > 0) {
            item.categories.forEach(cat => {
                const tag = document.createElement('span');
                tag.className = 'category-tag';
                tag.textContent = cat;
                categories.appendChild(tag);
            });
        }

        footer.appendChild(authorSection);
        footer.appendChild(categories);

        // Click whole card to open link or select
        card.addEventListener('click', (e) => {
            if (selectMode) {
                this.dashboardManager.toggleItemSelection(item.id);
            } else if (item.content.url) {
                chrome.tabs.create({ url: item.content.url });
            }
        });

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);

        return card;
    }

    /**
     * Render empty state
     * @param {HTMLElement} container 
     */
    renderEmptyState(container) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>No content found</h3>
        <p>Try adjusting filters or browse social media to save content.</p>
      </div>
    `;
    }
}
