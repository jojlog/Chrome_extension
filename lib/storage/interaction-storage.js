/**
 * Interaction Storage Manager
 * Handles operations related to saving and retrieving interactions
 */
export class InteractionStorage {
    /**
     * Save a new interaction
     * @param {Object} interaction - The interaction to save
     * @param {Function} updateMetadataCallback - Optional callback to update metadata
     * @param {Function} queueForAICallback - Optional callback to queue for AI
     * @returns {Promise<boolean>} Success status
     */
    async saveInteraction(interaction, updateMetadataCallback, queueForAICallback) {
        try {
            const { interactions = [] } = await chrome.storage.local.get('interactions');
            interactions.unshift(interaction);
            await chrome.storage.local.set({ interactions });

            console.log('Interaction saved:', interaction.id);

            if (updateMetadataCallback) await updateMetadataCallback();
            if (queueForAICallback) await queueForAICallback(interaction.id);

            return true;
        } catch (error) {
            console.error('Error saving interaction:', error);
            return false;
        }
    }

    /**
     * Get interactions with filtering
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of interactions
     */
    async getInteractions(filters = {}) {
        try {
            const { interactions = [] } = await chrome.storage.local.get('interactions');

            return interactions.filter(interaction => {
                if (filters.platform && interaction.platform !== filters.platform) return false;
                if (filters.category && !interaction.categories?.includes(filters.category)) return false;
                if (filters.startDate && interaction.timestamp < filters.startDate) return false;
                if (filters.endDate && interaction.timestamp > filters.endDate) return false;
                // Search filter could be added here or handled by caller
                return true;
            });
        } catch (error) {
            console.error('Error getting interactions:', error);
            return [];
        }
    }

    /**
     * Get interaction by ID
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async getInteractionById(id) {
        const { interactions = [] } = await chrome.storage.local.get('interactions');
        return interactions.find(i => i.id === id) || null;
    }

    /**
     * Update an interaction
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<boolean>}
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
            return false;
        } catch (error) {
            console.error('Error updating interaction:', error);
            return false;
        }
    }

    /**
     * Delete an interaction
     * @param {string} id 
     * @param {Function} updateMetadataCallback
     * @returns {Promise<boolean>}
     */
    async deleteInteraction(id, updateMetadataCallback) {
        try {
            const { interactions = [] } = await chrome.storage.local.get('interactions');
            const filtered = interactions.filter(i => i.id !== id);
            await chrome.storage.local.set({ interactions: filtered });

            if (updateMetadataCallback) await updateMetadataCallback();
            return true;
        } catch (error) {
            console.error('Error deleting interaction:', error);
            return false;
        }
    }
}
