// Storage Manager - Handles all chrome.storage operations
export class StorageManager {
  constructor() {
    this.storageType = 'local'; // 'local' or 'sync'
  }

  /**
   * Save a new interaction to storage
   * @param {Object} interaction - The interaction data to save
   * @returns {Promise<boolean>} Success status
   */
  async saveInteraction(interaction) {
    try {
      const { interactions = [] } = await chrome.storage.local.get('interactions');

      // Add new interaction at the beginning (most recent first)
      interactions.unshift(interaction);

      // Save back to storage
      await chrome.storage.local.set({ interactions });

      // Update metadata
      await this.updateMetadata();

      // Queue for AI processing
      await this.queueForAI(interaction.id);

      console.log('Interaction saved:', interaction.id);
      return true;
    } catch (error) {
      console.error('Error saving interaction:', error);
      return false;
    }
  }

  /**
   * Get interactions with optional filtering
   * @param {Object} filters - Filter criteria (platform, category, startDate, endDate)
   * @returns {Promise<Array>} Array of interactions
   */
  async getInteractions(filters = {}) {
    try {
      const { interactions = [] } = await chrome.storage.local.get('interactions');

      return interactions.filter(interaction => {
        if (filters.platform && interaction.platform !== filters.platform) return false;
        if (filters.category && !interaction.categories?.includes(filters.category)) return false;
        if (filters.startDate && interaction.timestamp < filters.startDate) return false;
        if (filters.endDate && interaction.timestamp > filters.endDate) return false;
        return true;
      });
    } catch (error) {
      console.error('Error getting interactions:', error);
      return [];
    }
  }

  /**
   * Get a single interaction by ID
   * @param {string} id - Interaction ID
   * @returns {Promise<Object|null>} The interaction or null
   */
  async getInteractionById(id) {
    const { interactions = [] } = await chrome.storage.local.get('interactions');
    return interactions.find(i => i.id === id) || null;
  }

  /**
   * Update an existing interaction
   * @param {string} id - Interaction ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>} Success status
   */
  async updateInteraction(id, updates) {
    try {
      const { interactions = [] } = await chrome.storage.local.get('interactions');
      const index = interactions.findIndex(i => i.id === id);

      if (index !== -1) {
        interactions[index] = { ...interactions[index], ...updates };
        await chrome.storage.local.set({ interactions });
        console.log('Interaction updated:', id);
        return true;
      }

      console.warn('Interaction not found:', id);
      return false;
    } catch (error) {
      console.error('Error updating interaction:', error);
      return false;
    }
  }

  /**
   * Delete an interaction
   * @param {string} id - Interaction ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteInteraction(id) {
    try {
      const { interactions = [] } = await chrome.storage.local.get('interactions');
      const filtered = interactions.filter(i => i.id !== id);
      await chrome.storage.local.set({ interactions: filtered });
      await this.updateMetadata();
      console.log('Interaction deleted:', id);
      return true;
    } catch (error) {
      console.error('Error deleting interaction:', error);
      return false;
    }
  }

  /**
   * Add interaction to AI processing queue
   * @param {string} interactionId - Interaction ID
   */
  async queueForAI(interactionId) {
    try {
      const { aiQueue = [] } = await chrome.storage.local.get('aiQueue');

      // Avoid duplicates
      if (!aiQueue.includes(interactionId)) {
        aiQueue.push(interactionId);
        await chrome.storage.local.set({ aiQueue });
        console.log('Added to AI queue:', interactionId);
      }
    } catch (error) {
      console.error('Error queuing for AI:', error);
    }
  }

  /**
   * Get the AI processing queue
   * @returns {Promise<Array>} Array of interaction IDs
   */
  async getAIQueue() {
    const { aiQueue = [] } = await chrome.storage.local.get('aiQueue');
    return aiQueue;
  }

  /**
   * Remove items from AI queue
   * @param {Array} ids - Interaction IDs to remove
   */
  async removeFromAIQueue(ids) {
    try {
      const { aiQueue = [] } = await chrome.storage.local.get('aiQueue');
      const filtered = aiQueue.filter(id => !ids.includes(id));
      await chrome.storage.local.set({ aiQueue: filtered });
    } catch (error) {
      console.error('Error removing from AI queue:', error);
    }
  }

  /**
   * Update storage metadata
   */
  async updateMetadata() {
    try {
      const { interactions = [] } = await chrome.storage.local.get('interactions');
      const storageUsed = await this.calculateStorageUsed();

      const metadata = {
        lastSync: Date.now(),
        totalInteractions: interactions.length,
        storageUsed: storageUsed
      };

      await chrome.storage.local.set({ metadata });
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }

  /**
   * Calculate total storage used
   * @returns {Promise<number>} Storage size in bytes
   */
  async calculateStorageUsed() {
    try {
      const data = await chrome.storage.local.get(null);
      const size = new Blob([JSON.stringify(data)]).size;
      return size;
    } catch (error) {
      console.error('Error calculating storage:', error);
      return 0;
    }
  }

  /**
   * Get storage metadata
   * @returns {Promise<Object>} Metadata object
   */
  async getMetadata() {
    const { metadata } = await chrome.storage.local.get('metadata');
    return metadata || { lastSync: 0, totalInteractions: 0, storageUsed: 0 };
  }

  /**
   * Get settings
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    return settings || this.getDefaultSettings();
  }

  /**
   * Update settings
   * @param {Object} updates - Settings to update
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

  /**
   * Get user-defined categories
   * @returns {Promise<Array>} Array of category strings
   */
  async getUserCategories() {
    const { userCategories } = await chrome.storage.local.get('userCategories');
    return userCategories || [];
  }

  /**
   * Save user-defined categories
   * @param {Array<string>} categories - Array of category strings to save
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
   * Add a user-defined category
   * @param {string} name - Category name to add
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
   * Edit an existing user-defined category
   * @param {string} oldName - Existing category name
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
   * Delete a user-defined category
   * @param {string} name - Category name to delete
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
   * Get default settings
   * @returns {Object} Default settings object
   */

  /**
   * Add a category to a specific interaction
   * @param {string} interactionId - ID of the interaction
   * @param {string} category - Category to add
   * @returns {Promise<boolean>} Success status
   */
  async addCategoryToInteraction(interactionId, category) {
    if (!interactionId || !category) return false;
    const interaction = await this.getInteractionById(interactionId);
    if (!interaction) return false;
    const categories = interaction.categories || [];
    if (categories.includes(category)) return false;
    categories.push(category);
    return await this.updateInteraction(interactionId, { categories });
  }

  /**
   * Edit categories of an interaction
   * @param {string} interactionId
   * @param {Array<string>} categories
   * @returns {Promise<boolean>}
   */
  async editInteractionCategories(interactionId, categories) {
    if (!interactionId || !Array.isArray(categories)) return false;
    return await this.updateInteraction(interactionId, { categories });
  }

  /**
   * Remove a category from an interaction
   * @param {string} interactionId
   * @param {string} category
   * @returns {Promise<boolean>}
   */
  async removeCategoryFromInteraction(interactionId, category) {
    if (!interactionId || !category) return false;
    const interaction = await this.getInteractionById(interactionId);
    if (!interaction || !interaction.categories) return false;
    const filtered = interaction.categories.filter(cat => cat !== category);
    return await this.updateInteraction(interactionId, { categories: filtered });
  }

  /**
   * Get default settings
   * @returns {Object} Default settings object
   */
  getDefaultSettings() {
    return {
      // New settings structure: supports both API keys
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
      categories: [],
      userCategories: [], // Default for custom categories
      userAccounts: {} // Map platform -> array of account objects
    };
  }

  /**
   * Initialize storage with default values
   */
  async initialize() {
    try {
      const { interactions, settings, aiQueue, metadata, userCategories } = await chrome.storage.local.get([
        'interactions',
        'settings',
        'aiQueue',
        'metadata',
        'userCategories' // Include userCategories in initialization
      ]);

      const updates = {};

      if (!interactions) {
        updates.interactions = [];
      }

      if (!settings) {
        updates.settings = this.getDefaultSettings();
      }

      if (!aiQueue) {
        updates.aiQueue = [];
      }

      if (!metadata) {
        updates.metadata = {
          lastSync: Date.now(),
          totalInteractions: 0,
          storageUsed: 0
        };
      }

      if (!userCategories) {
        updates.userCategories = [];
      }

      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
        console.log('Storage initialized with defaults');
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  /**
   * Export all data as JSON
   * @returns {Promise<Blob>} JSON blob of all data
   */
  async exportData() {
    try {
      const data = await chrome.storage.local.get(null);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      return blob;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  /**
   * Import data from JSON
   * @param {Object} data - Data object to import
   * @returns {Promise<boolean>} Success status
   */
  async importData(data) {
    try {
      await chrome.storage.local.set(data);
      console.log('Data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      await this.initialize();
      console.log('All data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Get all unique categories from saved interactions
   * @returns {Promise<Array>} Array of category strings
   */
  async getAllCategories() {
    const interactions = await this.getInteractions();
    const categories = new Set();

    interactions.forEach(interaction => {
      if (interaction.categories && Array.isArray(interaction.categories)) {
        interaction.categories.forEach(cat => categories.add(cat));
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Get statistics about saved content
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    const interactions = await this.getInteractions();
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    return {
      total: interactions.length,
      today: interactions.filter(i => i.timestamp >= today).length,
      thisWeek: interactions.filter(i => i.timestamp >= weekAgo).length,
      byPlatform: {
        instagram: interactions.filter(i => i.platform === 'instagram').length,
        twitter: interactions.filter(i => i.platform === 'twitter').length,
        linkedin: interactions.filter(i => i.platform === 'linkedin').length,
        tiktok: interactions.filter(i => i.platform === 'tiktok').length
      },
      byType: {
        like: interactions.filter(i => i.interactionType === 'like').length,
        save: interactions.filter(i => i.interactionType === 'save').length,
        retweet: interactions.filter(i => i.interactionType === 'retweet').length,
        timeBased: interactions.filter(i => i.interactionType === 'time-based').length
      }
    };
  }
}
