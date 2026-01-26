/**
 * Settings Storage Manager
 * Handles operations related to extension settings
 */
export class SettingsStorage {
    /**
     * Get default settings
     * @returns {Object} Default settings object
     */
    getDefaultSettings() {
        return {
            openaiApiKey: '',
            geminiApiKey: '',
            // Backward compatibility (deprecated)
            aiProvider: 'openai',
            apiKey: '',
            autoSaveTimeThreshold: 5000, // 5 seconds
            enabledPlatforms: {
                instagram: true,
                twitter: true,
                linkedin: true,
                tiktok: true
            },
            autoImportSavedPages: false,
            autoImportPaused: false,
            suppressImportNotifications: true,
            skipAIForImports: true,
            categories: []
            // Note: userCategories and userAccounts are stored as separate top-level keys
            // via CategoryStorage and AccountStorage respectively
        };
    }

    /**
     * Get current settings
     * @returns {Promise<Object>} Settings object
     */
    async getSettings() {
        const { settings } = await chrome.storage.local.get('settings');
        return settings || this.getDefaultSettings();
    }

    /**
     * Update settings
     * @param {Object} updates - Settings to update
     * @returns {Promise<boolean>} Success status
     */
    async updateSettings(updates) {
        try {
            const settings = await this.getSettings();
            const newSettings = { ...settings, ...updates };
            await chrome.storage.local.set({ settings: newSettings });
            console.log('Settings updated');
            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    }
}
