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
            aiCategorySystemPrompt: 'You are a content analyst. Your job is to assign concise, consistent categories to saved social media content.\n\nRules:\n- Learn from and reuse already existing categories, even if they were manually created.\n- Use the smallest reasonable number of categories; prefer reuse over creation.\n- Use short, stable category names (1-3 words).\n- Avoid near-duplicates, synonyms, or tiny variants.\n- Prefer broad parents with optional subcategories only when necessary (e.g., Security/Threats).\n- If uncertain, use an existing category that best fits.\n- Never invent more than one new category per item.\n- Output categories only (no explanations, no extra text).',
            autoSaveTimeThreshold: 5000, // 5 seconds
            enabledPlatforms: {
                instagram: true,
                twitter: true,
                linkedin: true,
                tiktok: true,
                threads: true,
                youtube: true
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
        const defaults = this.getDefaultSettings();
        return settings ? { ...defaults, ...settings } : defaults;
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
