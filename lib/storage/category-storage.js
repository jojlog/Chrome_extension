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
}
