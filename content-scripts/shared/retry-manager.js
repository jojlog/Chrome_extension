/**
 * Retry Manager - Handles retry logic for async operations
 */
export class RetryManager {
    /**
     * Execute an async operation with retries
     * @param {Function} operation - The async function to execute
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} delayMs - Delay between retries in ms
     * @returns {Promise<any>} The result of the operation
     */
    static async execute(operation, maxRetries = 3, delayMs = 500) {
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                // Don't retry if it's the last attempt
                if (attempt === maxRetries) break;

                console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying...`, error);

                // Wait before next retry
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        throw lastError;
    }
}
