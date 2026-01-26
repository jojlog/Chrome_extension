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
     * @returns {Promise<Object>} Result { success, skippedDuplicate, existingId? }
     */
    async saveInteraction(interaction, updateMetadataCallback, queueForAICallback) {
        try {
            const { interactions = [], interactionIndex = {} } = await chrome.storage.local.get([
                'interactions',
                'interactionIndex'
            ]);
            const index = this.ensureIndex(interactions, interactionIndex);

            if (interaction.contentKey && index[interaction.contentKey]) {
                return { success: true, skippedDuplicate: true, existingId: index[interaction.contentKey] };
            }

            interactions.unshift(interaction);
            if (interaction.contentKey) {
                index[interaction.contentKey] = interaction.id;
            }
            await chrome.storage.local.set({ interactions, interactionIndex: index });

            console.log('Interaction saved:', interaction.id);

            if (updateMetadataCallback) await updateMetadataCallback();
            if (queueForAICallback) await queueForAICallback(interaction.id);

            return { success: true, skippedDuplicate: false };
        } catch (error) {
            console.error('Error saving interaction:', error);
            return { success: false, skippedDuplicate: false };
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
     * Get interaction by content key
     * @param {string} contentKey
     * @returns {Promise<Object|null>}
     */
    async getInteractionByKey(contentKey) {
        if (!contentKey) return null;
        const { interactions = [], interactionIndex = {} } = await chrome.storage.local.get([
            'interactions',
            'interactionIndex'
        ]);
        const index = this.ensureIndex(interactions, interactionIndex);
        const id = index[contentKey];
        if (!id) return null;
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
            const { interactions = [], interactionIndex = {} } = await chrome.storage.local.get([
                'interactions',
                'interactionIndex'
            ]);
            const indexMap = this.ensureIndex(interactions, interactionIndex);
            const index = interactions.findIndex(i => i.id === id);

            if (index !== -1) {
                const existing = interactions[index];
                const updated = { ...existing, ...updates };
                interactions[index] = updated;

                if (existing.contentKey && existing.contentKey !== updated.contentKey) {
                    delete indexMap[existing.contentKey];
                }
                if (updated.contentKey) {
                    indexMap[updated.contentKey] = id;
                }

                await chrome.storage.local.set({ interactions, interactionIndex: indexMap });
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
            const { interactions = [], interactionIndex = {} } = await chrome.storage.local.get([
                'interactions',
                'interactionIndex'
            ]);
            const index = this.ensureIndex(interactions, interactionIndex);
            const toDelete = interactions.find(i => i.id === id);
            const filtered = interactions.filter(i => i.id !== id);
            if (toDelete?.contentKey) {
                delete index[toDelete.contentKey];
            }
            await chrome.storage.local.set({ interactions: filtered, interactionIndex: index });

            if (updateMetadataCallback) await updateMetadataCallback();
            return true;
        } catch (error) {
            console.error('Error deleting interaction:', error);
            return false;
        }
    }

    ensureIndex(interactions, interactionIndex) {
        if (!interactionIndex || typeof interactionIndex !== 'object') {
            return this.buildIndex(interactions);
        }

        const hasEntries = Object.keys(interactionIndex).length > 0;
        if (!hasEntries && interactions.length > 0) {
            return this.buildIndex(interactions);
        }

        return interactionIndex;
    }

    buildIndex(interactions) {
        const index = {};
        interactions.forEach(interaction => {
            if (interaction.contentKey) {
                index[interaction.contentKey] = interaction.id;
            }
        });
        return index;
    }
}
