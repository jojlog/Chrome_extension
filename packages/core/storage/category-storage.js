/**
 * Category Storage Manager
 * Handles operations related to user-defined categories
 */

// Predefined categories (duplicated from constants.js to avoid dynamic import issues)
// Keep in sync with lib/constants.js PREDEFINED_CATEGORIES
const PREDEFINED_CATEGORIES = [
    'Technology', 'Business', 'Health', 'Entertainment', 'Sports', 'Politics',
    'Science', 'Education', 'Travel', 'Food', 'Fashion', 'Art', 'Music',
    'Gaming', 'Finance', 'Marketing', 'Design', 'Photography', 'Fitness',
    'News', 'Lifestyle', 'DIY', 'Environment', 'Books', 'Movies', 'TV Shows',
    'Humor', 'Motivation', 'Career', 'Productivity', 'Relationships',
    'Parenting', 'Pets', 'Real Estate', 'Cryptocurrency', 'AI', 'Programming',
    'Data Science', 'Startups', 'Social Media', 'Writing', 'History',
    'Philosophy', 'Psychology', 'Self Improvement'
];

export class CategoryStorage {
    /**
     * Get user-defined categories
     * @returns {Promise<Array<string>>} Array of category names
     */
    async getUserCategories() {
        const { userCategories } = await chrome.storage.local.get('userCategories');
        return userCategories || [];
    }

    /**
     * Save user-defined categories
     * @param {Array<string>} categories - Array of category names
     * @returns {Promise<boolean>} Success status
     */
    async saveUserCategories(categories) {
        try {
            await chrome.storage.local.set({ userCategories: categories });
            console.log('User categories saved:', categories);
            return true;
        } catch (error) {
            console.error('Error saving user categories:', error);
            return false;
        }
    }

    /**
     * Add a new user category
     * @param {string} name - Category name
     * @returns {Promise<boolean>} Success status
     */
    async addUserCategory(name) {
        if (!name) return false;
        const categories = await this.getUserCategories();
        if (categories.includes(name)) return false;

        categories.push(name);
        return await this.saveUserCategories(categories);
    }

    /**
     * Edit an existing user category
     * @param {string} oldName - Old category name
     * @param {string} newName - New category name
     * @returns {Promise<boolean>} Success status
     */
    async editUserCategory(oldName, newName) {
        if (!oldName || !newName) return false;
        const categories = await this.getUserCategories();

        const idx = categories.indexOf(oldName);
        if (idx === -1 || categories.includes(newName)) return false;

        categories[idx] = newName;
        return await this.saveUserCategories(categories);
    }

    /**
     * Delete a user category
     * @param {string} name - Category name
     * @returns {Promise<boolean>} Success status
     */
    async deleteUserCategory(name) {
        if (!name) return false;
        const categories = await this.getUserCategories();

        const filtered = categories.filter(cat => cat !== name);
        if (filtered.length === categories.length) return false;

        return await this.saveUserCategories(filtered);
    }

    /**
     * Get all categories (predefined + user defined)
     * @returns {Promise<Array<string>>} Combined unique sorted categories
     */
    async getAllCategories() {
        const userCategories = await this.getUserCategories();
        return [...new Set([...PREDEFINED_CATEGORIES, ...userCategories])].sort();
    }

    /**
     * Get all categories with usage counts from interactions
     * @returns {Promise<Array<{name: string, usageCount: number, isUserDefined: boolean}>>}
     */
    async getCategoriesWithUsage() {
        const { interactions = [] } = await chrome.storage.local.get('interactions');
        const userCategories = await this.getUserCategories();

        // Count usage for each category
        const usageMap = new Map();

        for (const interaction of interactions) {
            const categories = interaction.categories || [];
            for (const cat of categories) {
                if (cat && cat !== 'Uncategorized') {
                    usageMap.set(cat, (usageMap.get(cat) || 0) + 1);
                }
            }
        }

        // Build result with all known categories
        const allCategoryNames = new Set([
            ...PREDEFINED_CATEGORIES,
            ...userCategories,
            ...usageMap.keys()  // Include any categories that exist in data but not in lists
        ]);

        const result = [];
        for (const name of allCategoryNames) {
            if (name && name !== 'Uncategorized') {
                result.push({
                    name,
                    usageCount: usageMap.get(name) || 0,
                    isUserDefined: userCategories.includes(name) && !PREDEFINED_CATEGORIES.includes(name)
                });
            }
        }

        // Sort by usage count (descending), then alphabetically
        result.sort((a, b) => {
            if (b.usageCount !== a.usageCount) {
                return b.usageCount - a.usageCount;
            }
            return a.name.localeCompare(b.name);
        });

        return result;
    }
}
