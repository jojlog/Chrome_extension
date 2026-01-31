/**
 * Filters Manager - Handles content filtering and sorting
 */
export class FiltersManager {
    /**
     * Filter content based on criteria
     * @param {Array} items - All items
     * @param {Object} filters - Filter criteria {platform, category, search, includeCategories, excludeCategories}
     * @returns {Array} Filtered items
     */
    filterContent(items, filters) {
        let filtered = [...items];

        // Filter by Platform
        if (filters.platform && filters.platform !== 'all') {
            filtered = filtered.filter(item => item.platform === filters.platform);
        }

        // Filter by Category
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(item =>
                item.categories && item.categories.includes(filters.category)
            );
        }

        // Include Category Filters (any match)
        if (filters.includeCategories && filters.includeCategories.length > 0) {
            filtered = filtered.filter(item => {
                if (!item.categories || item.categories.length === 0) return false;
                return filters.includeCategories.some(cat => item.categories.includes(cat));
            });
        }

        // Exclude Category Filters (no match)
        if (filters.excludeCategories && filters.excludeCategories.length > 0) {
            filtered = filtered.filter(item => {
                if (!item.categories || item.categories.length === 0) return true;
                return !filters.excludeCategories.some(cat => item.categories.includes(cat));
            });
        }

        // Filter by Search
        if (filters.search && filters.search.trim() !== '') {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(item => {
                const textMatch = item.content.text && item.content.text.toLowerCase().includes(term);
                const captionsMatch = item.content.captions && item.content.captions.toLowerCase().includes(term);
                const authorMatch = item.metadata.author && item.metadata.author.toLowerCase().includes(term);
                const tagMatch = item.categories && item.categories.some(c => c.toLowerCase().includes(term));
                return textMatch || captionsMatch || authorMatch || tagMatch;
            });
        }

        return filtered;
    }

    /**
     * Sort content
     * @param {Array} items - Items to sort
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted items
     */
    sortContent(items, sortBy) {
        const sorted = [...items];

        switch (sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => b.timestamp - a.timestamp);

            case 'date-asc':
                return sorted.sort((a, b) => a.timestamp - b.timestamp);

            case 'engagement':
                return sorted.sort((a, b) => {
                    const engA = (a.metadata.likes || 0) + (a.metadata.comments || 0);
                    const engB = (b.metadata.likes || 0) + (b.metadata.comments || 0);
                    return engB - engA;
                });

            case 'duration':
                return sorted.sort((a, b) => (b.viewDuration || 0) - (a.viewDuration || 0));

            default:
                return sorted;
        }
    }
}
