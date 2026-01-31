// Storage Manager - Handles all chrome.storage operations
import { InteractionStorage } from './storage/interaction-storage.js';
import { SettingsStorage } from './storage/settings-storage.js';
import { CategoryStorage } from './storage/category-storage.js';
import { AccountStorage } from './storage/account-storage.js';

export class StorageManager {
  constructor() {
    this.storageType = 'local'; // 'local' or 'sync'

    // Initialize sub-modules
    this.interactionStorage = new InteractionStorage();
    this.settingsStorage = new SettingsStorage();
    this.categoryStorage = new CategoryStorage();
    this.accountStorage = new AccountStorage();
  }

  /**
   * Initialize storage with default values
   */
  async initialize() {
    try {
      const settings = await this.getSettings();
      if (!settings) {
        await chrome.storage.local.set({
          settings: this.getDefaultSettings()
        });
      }
      console.log('Storage initialized');
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  // Delegate Interaction Methods
  async saveInteraction(interaction, options = {}) {
    const queueCallback = options.skipAI ? null : (id) => this.queueForAI(id);
    return this.interactionStorage.saveInteraction(
      interaction,
      () => this.updateMetadata(),
      queueCallback
    );
  }

  async getInteractions(filters = {}) {
    return this.interactionStorage.getInteractions(filters);
  }

  async getInteractionById(id) {
    return this.interactionStorage.getInteractionById(id);
  }

  async getInteractionByKey(contentKey) {
    return this.interactionStorage.getInteractionByKey(contentKey);
  }

  async updateInteraction(id, updates) {
    return this.interactionStorage.updateInteraction(id, updates);
  }

  async deleteInteraction(id) {
    return this.interactionStorage.deleteInteraction(id, () => this.updateMetadata());
  }

  // Delegate Settings Methods
  getDefaultSettings() {
    return this.settingsStorage.getDefaultSettings();
  }

  async getSettings() {
    return this.settingsStorage.getSettings();
  }

  async updateSettings(updates) {
    return this.settingsStorage.updateSettings(updates);
  }

  // Delegate Category Methods
  async getUserCategories() {
    return this.categoryStorage.getUserCategories();
  }

  async saveUserCategories(categories) {
    return this.categoryStorage.saveUserCategories(categories);
  }

  async addUserCategory(name) {
    return this.categoryStorage.addUserCategory(name);
  }

  async editUserCategory(oldName, newName) {
    return this.categoryStorage.editUserCategory(oldName, newName);
  }

  async deleteUserCategory(name) {
    return this.categoryStorage.deleteUserCategory(name);
  }

  async getAllCategories() {
    return this.categoryStorage.getAllCategories();
  }

  async getCategoriesWithUsage() {
    return this.categoryStorage.getCategoriesWithUsage();
  }

  // Delegate Account Methods
  async getUserAccounts() {
    return this.accountStorage.getUserAccounts();
  }

  async saveUserAccounts(accounts) {
    return this.accountStorage.saveUserAccounts(accounts);
  }

  async addUserAccount(platform, accountInfo) {
    return this.accountStorage.addUserAccount(platform, accountInfo);
  }

  async updateUserAccount(platform, accountId, updates) {
    return this.accountStorage.updateUserAccount(platform, accountId, updates);
  }

  async removeUserAccount(platform, accountId) {
    return this.accountStorage.removeUserAccount(platform, accountId);
  }

  // Interaction Category Helper Methods
  async addCategoryToInteraction(interactionId, category) {
    if (!interactionId || !category) return false;
    const interaction = await this.getInteractionById(interactionId);
    if (!interaction) return false;

    const categories = interaction.categories || [];
    if (categories.includes(category)) return false;

    categories.push(category);
    return await this.updateInteraction(interactionId, { categories });
  }

  async editInteractionCategories(interactionId, categories) {
    if (!interactionId || !Array.isArray(categories)) return false;
    return await this.updateInteraction(interactionId, { categories });
  }

  async removeCategoryFromInteraction(interactionId, category) {
    if (!interactionId || !category) return false;
    const interaction = await this.getInteractionById(interactionId);
    if (!interaction || !interaction.categories) return false;

    const filtered = interaction.categories.filter(cat => cat !== category);
    return await this.updateInteraction(interactionId, { categories: filtered });
  }

  // Metadata & AI Queue Methods (Kept in main class or could be split further)
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

  async getMetadata() {
    const { metadata } = await chrome.storage.local.get('metadata');
    return metadata || { lastSync: 0, totalInteractions: 0, storageUsed: 0 };
  }

  async queueForAI(interactionId) {
    try {
      const { aiQueue = [] } = await chrome.storage.local.get('aiQueue');
      if (!aiQueue.includes(interactionId)) {
        aiQueue.push(interactionId);
        await chrome.storage.local.set({ aiQueue });
        console.log('Added to AI queue:', interactionId);
      }
    } catch (error) {
      console.error('Error queuing for AI:', error);
    }
  }

  async getAIQueue() {
    const { aiQueue = [] } = await chrome.storage.local.get('aiQueue');
    return aiQueue;
  }

  async removeFromAIQueue(ids) {
    try {
      const { aiQueue = [] } = await chrome.storage.local.get('aiQueue');
      const filtered = aiQueue.filter(id => !ids.includes(id));
      await chrome.storage.local.set({ aiQueue: filtered });
    } catch (error) {
      console.error('Error removing from AI queue:', error);
    }
  }

  async getStatistics() {
    try {
      const interactions = await this.getInteractions();
      const now = new Date();

      // Create new Date objects to avoid mutating 'now'
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const stats = {
        total: interactions.length,
        today: interactions.filter(i => i.timestamp >= startOfDay.getTime()).length,
        thisWeek: interactions.filter(i => i.timestamp >= startOfWeek.getTime()).length,
        byPlatform: {
          instagram: interactions.filter(i => i.platform === 'instagram').length,
          twitter: interactions.filter(i => i.platform === 'twitter').length,
          linkedin: interactions.filter(i => i.platform === 'linkedin').length,
          tiktok: interactions.filter(i => i.platform === 'tiktok').length,
          threads: interactions.filter(i => i.platform === 'threads').length,
          youtube: interactions.filter(i => i.platform === 'youtube').length
        }
      };
      return stats;
    } catch (error) {
      console.error('Error calculating statistics:', error);
      return { total: 0, today: 0, thisWeek: 0, byPlatform: {} };
    }
  }

  async exportData() {
    try {
      const data = await chrome.storage.local.get(null);
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }
}
