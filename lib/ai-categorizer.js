// AI Categorizer - Handles AI-based content categorization
export class AICategorizer {
  constructor() {
    this.openaiApiKey = null;
    this.geminiApiKey = null;
    // Backward compatibility
    this.provider = null; // 'openai' or 'gemini' (deprecated)
    this.apiKey = null; // deprecated
    this.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
  }

  /**
   * Initialize with settings from storage
   */
  async init() {
    try {
      const { settings } = await chrome.storage.local.get('settings');
      if (settings) {
        // Use new settings structure first
        this.openaiApiKey = settings.openaiApiKey || '';
        this.geminiApiKey = settings.geminiApiKey || '';

        // Backward compatibility: use existing settings if present
        if (!this.openaiApiKey && !this.geminiApiKey) {
          this.provider = settings.aiProvider || 'openai';
          this.apiKey = settings.apiKey || '';

          // Migrate existing settings to new structure
          if (this.apiKey) {
            if (this.provider === 'openai') {
              this.openaiApiKey = this.apiKey;
            } else if (this.provider === 'gemini') {
              this.geminiApiKey = this.apiKey;
            }
          }
        }

        // Also try to load from config/env.js (doesn't work at runtime but can be injected during build)
        try {
          if (typeof window !== 'undefined' && window.ENV_CONFIG) {
            if (window.ENV_CONFIG.OPENAI_API_KEY && !this.openaiApiKey) {
              this.openaiApiKey = window.ENV_CONFIG.OPENAI_API_KEY;
            }
            if (window.ENV_CONFIG.GEMINI_API_KEY && !this.geminiApiKey) {
              this.geminiApiKey = window.ENV_CONFIG.GEMINI_API_KEY;
            }
          }
        } catch (e) {
          // Works fine even if env.js doesn't exist
        }
      }
    } catch (error) {
      console.error('Error initializing AI categorizer:', error);
    }
  }

  /**
   * Categorize content using AI
   * If both OpenAI and Gemini are available, OpenAI is tried first, then Gemini as fallback
   * @param {Object} interaction - The interaction object to categorize
   * @returns {Promise<Array>} Array of category strings
   */
  async categorizeContent(interaction) {
    const hasOpenAI = this.openaiApiKey && this.openaiApiKey.trim() !== '';
    const hasGemini = this.geminiApiKey && this.geminiApiKey.trim() !== '';

    // Backward compatibility: use existing settings
    const hasLegacyKey = this.apiKey && this.apiKey.trim() !== '';
    const legacyProvider = this.provider || 'openai';

    // Return Uncategorized if no API key is available
    if (!hasOpenAI && !hasGemini && !hasLegacyKey) {
      console.warn('No API key configured for AI categorization');
      return { categories: ['Uncategorized'], failureReason: 'No API key configured' };
    }

    // Wait for rate limit slot
    await this.rateLimiter.waitForSlot();

    const prompt = this.buildPrompt(interaction);

    // Priority: OpenAI > Gemini > Legacy
    // Try OpenAI first if available
    if (hasOpenAI) {
      try {
        const categories = await this.categorizeWithOpenAI(prompt, this.openaiApiKey);
        return { categories };
      } catch (error) {
        console.warn('OpenAI categorization failed, trying Gemini:', error);
        // Try Gemini if OpenAI fails
        if (hasGemini) {
          try {
            const categories = await this.categorizeWithGemini(prompt, this.geminiApiKey);
            return { categories };
          } catch (geminiError) {
            console.error('Both AI providers failed:', geminiError);
            return { categories: ['Uncategorized'], failureReason: `Both AI providers failed: ${geminiError.message}` };
          }
        }
        return { categories: ['Uncategorized'], failureReason: `OpenAI failed: ${error.message}` };
      }
    }

    // Only Gemini available
    if (hasGemini) {
      try {
        const categories = await this.categorizeWithGemini(prompt, this.geminiApiKey);
        return { categories };
      } catch (error) {
        console.error('Gemini categorization error:', error);
        return { categories: ['Uncategorized'], failureReason: `Gemini failed: ${error.message}` };
      }
    }

    // Backward compatibility: use legacy method
    if (hasLegacyKey) {
      try {
        if (legacyProvider === 'openai') {
          return { categories: await this.categorizeWithOpenAI(prompt, this.apiKey) };
        } else if (legacyProvider === 'gemini') {
          return { categories: await this.categorizeWithGemini(prompt, this.apiKey) };
        }
      } catch (error) {
        console.error('Legacy AI categorization error:', error);
        return { categories: ['Uncategorized'], failureReason: `Legacy AI failed: ${error.message}` };
      }
    }

    return { categories: ['Uncategorized'], failureReason: 'Unknown categorization error' };
  }

  /**
   * Build categorization prompt
   * @param {Object} interaction - The interaction object
   * @returns {string} Prompt text
   */
  buildPrompt(interaction) {
    const contentText = interaction.content?.text || '';
    const author = interaction.metadata?.author || 'Unknown';
    const platform = interaction.platform || 'unknown';

    return `Analyze the following social media post and categorize it into 1-3 relevant topics.\n\nPlatform: ${platform}\nAuthor: ${author}\nContent: ${contentText}\n\nAvailable categories: Technology, Business, Health, Entertainment, Sports, Politics, Science, Education, Travel, Food, Fashion, Art, Music, Gaming, Finance, Marketing, Design, Photography, Fitness, News, Lifestyle, DIY, Environment, Books, Movies, TV Shows, Humor, Motivation, Career, Productivity, Relationships, Parenting, Pets, Real Estate, Cryptocurrency, AI, Programming, Data Science, Startups, Social Media, Photography, Writing, History, Philosophy, Psychology, Self Improvement\n\nInstructions:\n1. Select 1-3 most relevant categories from the list above\n2. If none fit well, you may suggest new appropriate categories\n3. Be concise and accurate\n4. Respond with ONLY a JSON array of category strings\n\nExample response format: ["Technology", "AI", "Programming"]`;
  }

  /**
   * Categorize using OpenAI API
   * @param {string} prompt - The prompt text
   * @param {string} apiKey - OpenAI API key (optional, uses this.apiKey if not provided)
   * @returns {Promise<Array>} Array of categories
   */
  async categorizeWithOpenAI(prompt, apiKey = null) {
    const key = apiKey || this.openaiApiKey || this.apiKey;
    if (!key) {
      throw new Error('OpenAI API key is missing.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a content categorization assistant. Always respond with valid JSON arrays only. Be concise and accurate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Extract JSON from response (handle markdown code blocks)
    let jsonString = content;
    if (content.includes('```json')) {
      jsonString = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonString = content.split('```')[1].split('```')[0].trim();
    }

    // Parse JSON response
    try {
      const categories = JSON.parse(jsonString);
      return Array.isArray(categories) ? categories : ['Uncategorized'];
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error(`Failed to parse OpenAI response: ${content}`);
    }
  }

  /**
   * Categorize using Google Gemini API
   * @param {string} prompt - The prompt text
   * @param {string} apiKey - Gemini API key (optional, uses this.geminiApiKey if not provided)
   * @returns {Promise<Array>} Array of categories
   */
  async categorizeWithGemini(prompt, apiKey = null) {
    const key = apiKey || this.geminiApiKey || this.apiKey;
    if (!key) {
      throw new Error('Gemini API key is missing.');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 100
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();

    // Extract JSON from response
    let jsonString = content;
    if (content.includes('```json')) {
      jsonString = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonString = content.split('```')[1].split('```')[0].trim();
    }

    // Parse JSON response
    try {
      const categories = JSON.parse(jsonString);
      return Array.isArray(categories) ? categories : ['Uncategorized'];
    } catch (e) {
      console.error('Failed to parse Gemini response:', content);
      throw new Error(`Failed to parse Gemini response: ${content}`);
    }
  }

  /**
   * Batch categorize multiple interactions
   * @param {Array} interactions - Array of interaction objects
   * @returns {Promise<Array>} Array of results with {id, categories}
   */
  async batchCategorize(interactions) {
    const results = [];

    for (const interaction of interactions) {
      try {
        const { categories, failureReason } = await this.categorizeContent(interaction);
        results.push({ id: interaction.id, categories, failureReason });
      } catch (error) {
        console.error(`Error categorizing interaction ${interaction.id}:`, error);
        results.push({ id: interaction.id, categories: ['Uncategorized'], failureReason: error.message });
      }
    }

    return results;
  }
}

/**
 * Rate Limiter - Ensures we don't exceed API rate limits
 */
export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Wait for an available slot in the rate limit window
   * @returns {Promise<void>}
   */
  async waitForSlot() {
    const now = Date.now();

    // Remove requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // If we've hit the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer

      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Try again after waiting
      return this.waitForSlot();
    }

    // Add this request to the list
    this.requests.push(now);
  }
}
