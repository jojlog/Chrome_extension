// Content Extractor - Utility functions for extracting content from posts
class ContentExtractor {
  /**
   * Extract text content from element, cleaning up whitespace
   * @param {HTMLElement} element - Element to extract text from
   * @returns {string} Cleaned text content
   */
  static extractText(element) {
    if (!element) return '';

    const text = element.innerText || element.textContent || '';
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract image URLs from element
   * @param {HTMLElement} element - Element to search for images
   * @param {string} selector - CSS selector for images (default: 'img')
   * @param {Function|null} filterFn - Optional filter function (imgEl) => boolean
   * @returns {Array<string>} Array of image URLs
   */
  static extractImageUrls(element, selector = 'img', filterFn = null) {
    if (!element) return [];

    const images = element.querySelectorAll(selector);
    const urls = [];

    images.forEach(img => {
      if (filterFn && !filterFn(img)) {
        return;
      }
      // Try different image URL sources
      const url = img.src || img.dataset.src || img.currentSrc;
      if (url && url.startsWith('http')) {
        urls.push(url);
      }
    });

    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Extract video URL from element
   * @param {HTMLElement} element - Element to search for video
   * @returns {string|null} Video URL or null
   */
  static extractVideoUrl(element) {
    if (!element) return null;

    const video = element.querySelector('video');
    if (video) {
      return video.src || video.currentSrc || null;
    }

    return null;
  }

  /**
   * Extract link/URL from element
   * @param {HTMLElement} element - Element to search for link
   * @param {string} selector - CSS selector for link
   * @returns {string} URL
   */
  static extractLink(element, selector) {
    if (!element) return window.location.href;

    const linkElement = selector ? element.querySelector(selector) : element.closest('a');
    if (linkElement && linkElement.href) {
      return linkElement.href;
    }

    return window.location.href;
  }

  /**
   * Extract hashtags from text
   * @param {string} text - Text to extract hashtags from
   * @returns {Array<string>} Array of hashtags without # symbol
   */
  static extractHashtags(text) {
    if (!text) return [];

    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);

    if (!matches) return [];

    return matches.map(tag => tag.substring(1)); // Remove # symbol
  }

  /**
   * Extract mentions from text
   * @param {string} text - Text to extract mentions from
   * @returns {Array<string>} Array of mentions without @ symbol
   */
  static extractMentions(text) {
    if (!text) return [];

    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);

    if (!matches) return [];

    return matches.map(mention => mention.substring(1)); // Remove @ symbol
  }

  /**
   * Parse engagement count (likes, comments, shares)
   * Handles formats like "1.2K", "5M", "123"
   * @param {string} text - Text containing count
   * @returns {number} Numeric count
   */
  static parseEngagementCount(text) {
    if (!text) return 0;

    // Extract number with possible K/M/B suffix
    const match = text.match(/[\d,.]+[KMB]?/i);
    if (!match) return 0;

    const numStr = match[0].replace(/,/g, '');
    const num = parseFloat(numStr);
    const suffix = numStr.slice(-1).toUpperCase();

    const multipliers = {
      'K': 1000,
      'M': 1000000,
      'B': 1000000000
    };

    return Math.round(num * (multipliers[suffix] || 1));
  }

  /**
   * Extract date/time from element
   * @param {HTMLElement} element - Element containing date
   * @returns {string} ISO 8601 date string
   */
  static extractDate(element) {
    if (!element) return new Date().toISOString();

    // Try datetime attribute first
    if (element.dateTime) {
      return new Date(element.dateTime).toISOString();
    }

    // Try data-time or similar attributes
    const timeAttr = element.dataset.time || element.dataset.timestamp;
    if (timeAttr) {
      return new Date(parseInt(timeAttr)).toISOString();
    }

    // Try parsing text content
    const text = element.textContent || element.innerText;
    if (text) {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Default to current time
    return new Date().toISOString();
  }

  /**
   * Clean and sanitize text content
   * @param {string} text - Text to clean
   * @param {number} maxLength - Maximum length (optional)
   * @returns {string} Cleaned text
   */
  static cleanText(text, maxLength = null) {
    if (!text) return '';

    let cleaned = text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }

    return cleaned;
  }

  /**
   * Try multiple selectors and return first match
   * @param {HTMLElement} element - Root element to search
   * @param {Array<string>} selectors - Array of CSS selectors to try
   * @returns {HTMLElement|null} First matching element or null
   */
  static findWithFallback(element, selectors) {
    if (!element || !selectors) return null;

    for (const selector of selectors) {
      try {
        const found = element.querySelector(selector);
        if (found) return found;
      } catch (e) {
        // Invalid selector, continue to next
        console.warn('Invalid selector:', selector);
      }
    }

    return null;
  }

  /**
   * Try multiple selectors and return all matches
   * @param {HTMLElement} element - Root element to search
   * @param {Array<string>} selectors - Array of CSS selectors to try
   * @returns {Array<HTMLElement>} Array of matching elements
   */
  static findAllWithFallback(element, selectors) {
    if (!element || !selectors) return [];

    for (const selector of selectors) {
      try {
        const found = element.querySelectorAll(selector);
        if (found.length > 0) return Array.from(found);
      } catch (e) {
        // Invalid selector, continue to next
        console.warn('Invalid selector:', selector);
      }
    }

    return [];
  }

  /**
   * Generate a unique post ID based on content
   * @param {string} platform - Platform name
   * @param {string} url - Post URL
   * @param {string} text - Post text (optional)
   * @returns {string} Unique ID
   */
  static generatePostId(platform, url, text = '') {
    const timestamp = Date.now();
    const content = `${platform}_${url}_${text}`.substring(0, 100);

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `${platform}_${timestamp}_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Create a stable key for de-duplication
   * @param {string} platform - Platform name
   * @param {string} url - Content URL
   * @param {string} text - Content text (optional)
   * @returns {string} Stable content key
   */
  static createContentKey(platform, url, text = '') {
    const normalizedUrl = this.normalizeUrlForKey(url, platform);
    if (normalizedUrl) {
      return `${platform}:${normalizedUrl}`;
    }

    const cleanedText = this.cleanText(text).slice(0, 200);
    if (cleanedText) {
      return `${platform}:text:${this.hashString(cleanedText)}`;
    }

    const fallbackUrl = this.normalizeUrlForKey(window.location.href, platform) || window.location.href;
    return `${platform}:location:${this.hashString(fallbackUrl)}`;
  }

  /**
   * Normalize a URL for stable keying
   * @param {string} url - Input URL
   * @param {string} platform - Platform name
   * @returns {string} Normalized URL
   */
  static normalizeUrlForKey(url, platform) {
    if (!url) return '';
    try {
      const parsed = new URL(url, window.location.href);
      parsed.hash = '';

      const hostname = parsed.hostname.toLowerCase();
      if (platform === 'twitter' && (hostname.endsWith('twitter.com') || hostname.endsWith('x.com'))) {
        parsed.hostname = 'x.com';
      } else {
        parsed.hostname = hostname;
      }

      const trackingKeys = new Set([
        'fbclid',
        'gclid',
        'igshid',
        'ref',
        'ref_src',
        'source',
        's',
        'share',
        'si',
        'mc_cid',
        'mc_eid'
      ]);

      const params = parsed.searchParams;
      [...params.keys()].forEach((key) => {
        if (trackingKeys.has(key) || key.startsWith('utm_')) {
          params.delete(key);
        }
      });

      parsed.search = params.toString() ? `?${params.toString()}` : '';
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');

      return `${parsed.origin}${parsed.pathname}${parsed.search}`;
    } catch (error) {
      return url;
    }
  }

  /**
   * Simple deterministic hash for strings
   * @param {string} input - Input string
   * @returns {string} Hash string
   */
  static hashString(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Extract author information
   * @param {HTMLElement} element - Element containing author info
   * @param {string} nameSelector - Selector for author name
   * @param {string} linkSelector - Selector for author link
   * @returns {Object} Author information {name, url}
   */
  static extractAuthor(element, nameSelector, linkSelector) {
    const name = this.findWithFallback(element,
      Array.isArray(nameSelector) ? nameSelector : [nameSelector]
    );

    const link = this.findWithFallback(element,
      Array.isArray(linkSelector) ? linkSelector : [linkSelector]
    );

    return {
      name: name ? this.extractText(name) : 'Unknown',
      url: link ? link.href : ''
    };
  }

  /**
   * Check if element is visible in viewport
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if visible
   */
  static isInViewport(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Wait for element to appear in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in ms (default 5000)
   * @returns {Promise<HTMLElement|null>} Element or null if timeout
   */
  static waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Debounce function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Make available globally
window.ContentExtractor = ContentExtractor;
