// Default Settings Configuration
const DEFAULT_SETTINGS = {
  // AI Categorization
  // If both API keys are provided, OpenAI will be tried first, then Gemini as fallback
  openaiApiKey: '', // OpenAI API Key (optional)
  geminiApiKey: '', // Google Gemini API Key (optional)
  // Kept for backward compatibility (deprecated)
  aiProvider: 'openai', // 'openai' or 'gemini' (deprecated - both keys can be used)
  apiKey: '', // Deprecated - use openaiApiKey and geminiApiKey instead

  // Time Tracking
  autoSaveTimeThreshold: 5000, // 5 seconds in milliseconds

  // Enabled Platforms
  enabledPlatforms: {
    instagram: true,
    twitter: true,
    linkedin: true,
    tiktok: true
  },

  // Custom Categories (user-defined)
  categories: [],

  // Feature Flags
  features: {
    timeBasedAutoSave: false, // Auto-save posts viewed for threshold time
    notifications: true, // Show save notifications
    batchAIProcessing: true // Process AI in batches
  }
};

// Predefined Categories for AI
const PREDEFINED_CATEGORIES = [
  'Technology',
  'Business',
  'Health',
  'Entertainment',
  'Sports',
  'Politics',
  'Science',
  'Education',
  'Travel',
  'Food',
  'Fashion',
  'Art',
  'Music',
  'Gaming',
  'Finance',
  'Marketing',
  'Design',
  'Photography',
  'Fitness',
  'News',
  'Lifestyle',
  'DIY',
  'Environment',
  'Books',
  'Movies',
  'TV Shows',
  'Humor',
  'Motivation',
  'Career',
  'Productivity',
  'Relationships',
  'Parenting',
  'Pets',
  'Real Estate',
  'Cryptocurrency',
  'AI',
  'Programming',
  'Data Science',
  'Startups',
  'Social Media',
  'Writing',
  'History',
  'Philosophy',
  'Psychology',
  'Self Improvement'
];

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_SETTINGS,
    PREDEFINED_CATEGORIES
  };
}
