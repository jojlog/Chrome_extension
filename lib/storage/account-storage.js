/**
 * Account Storage Manager
 * Handles operations related to user accounts
 */
export class AccountStorage {
    /**
     * Get all user accounts
     * @returns {Promise<Object>} Map of platform -> array of accounts
     */
    async getUserAccounts() {
        const { userAccounts } = await chrome.storage.local.get('userAccounts');
        return userAccounts || {};
    }

    /**
     * Save all user accounts
     * @param {Object} accounts - Map of platform -> array of accounts
     * @returns {Promise<boolean>} Success status
     */
    async saveUserAccounts(accounts) {
        try {
            await chrome.storage.local.set({ userAccounts: accounts });
            console.log('User accounts saved');
            return true;
        } catch (error) {
            console.error('Error saving user accounts:', error);
            return false;
        }
    }

    /**
     * Add a new account
     * @param {string} platform - Platform name
     * @param {Object} accountInfo - Account details
     * @returns {Promise<boolean>} Success status
     */
    async addUserAccount(platform, accountInfo) {
        if (!platform || !accountInfo || !accountInfo.id) return false;

        const accounts = await this.getUserAccounts();
        if (!accounts[platform]) {
            accounts[platform] = [];
        }

        // Check if account already exists
        const exists = accounts[platform].some(acc => acc.id === accountInfo.id);
        if (exists) return false;

        accounts[platform].push(accountInfo);
        return await this.saveUserAccounts(accounts);
    }

    /**
     * Update an existing account
     * @param {string} platform - Platform name
     * @param {string} accountId - Account ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<boolean>} Success status
     */
    async updateUserAccount(platform, accountId, updates) {
        const accounts = await this.getUserAccounts();
        if (!accounts[platform]) return false;

        const index = accounts[platform].findIndex(acc => acc.id === accountId);
        if (index === -1) return false;

        accounts[platform][index] = { ...accounts[platform][index], ...updates };
        return await this.saveUserAccounts(accounts);
    }

    /**
     * Remove an account
     * @param {string} platform - Platform name
     * @param {string} accountId - Account ID
     * @returns {Promise<boolean>} Success status
     */
    async removeUserAccount(platform, accountId) {
        const accounts = await this.getUserAccounts();
        if (!accounts[platform]) return false;

        const initialLength = accounts[platform].length;
        accounts[platform] = accounts[platform].filter(acc => acc.id !== accountId);

        if (accounts[platform].length === initialLength) return false;

        return await this.saveUserAccounts(accounts);
    }
}
