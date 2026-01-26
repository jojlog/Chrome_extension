// Environment Configuration
// You can set API keys directly in this file, or use a .env file.
// To use a .env file, run the build script.

// Uncomment and set values below to load from .env file
// Or enter values directly

const ENV_CONFIG = {
  // OpenAI API Key (optional)
  // Use OPENAI_API_KEY from .env file or enter directly here
  OPENAI_API_KEY: '', // e.g., 'sk-proj-...'

  // Google Gemini API Key (optional)
  // Use GEMINI_API_KEY from .env file or enter directly here
  GEMINI_API_KEY: '' // e.g., 'AIza...'
};

// Load from .env file (only works in Node.js environment)
// Chrome extensions cannot read .env at runtime,
// so use the build script or enter values directly in ENV_CONFIG above

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENV_CONFIG;
} else if (typeof window !== 'undefined') {
  window.ENV_CONFIG = ENV_CONFIG;
}
