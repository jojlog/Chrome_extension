// Time Tracker - Tracks how long users view posts
class TimeTracker {
  constructor() {
    this.activePost = null;
    this.startTime = null;
    this.durations = new Map(); // postId -> total duration in ms
    this.threshold = 5000; // 5 seconds minimum view time
    this.observer = null;
    this.isTabVisible = true;

    this.setupVisibilityTracking();
  }

  /**
   * Initialize IntersectionObserver for viewport tracking
   */
  initialize() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.startTracking(entry.target);
          } else {
            this.stopTracking(entry.target);
          }
        });
      },
      {
        threshold: 0.5, // Post must be 50% visible
        rootMargin: '0px'
      }
    );

    console.log('TimeTracker initialized');
  }

  /**
   * Setup tab visibility tracking
   */
  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;

      if (document.hidden) {
        this.pauseTracking();
      } else {
        this.resumeTracking();
      }
    });
  }

  /**
   * Observe a post element for time tracking
   * @param {HTMLElement} postElement - The post DOM element
   * @param {string} postId - Unique identifier for the post
   */
  observePost(postElement, postId) {
    if (!this.observer) {
      this.initialize();
    }

    // Store the post ID on the element
    postElement.dataset.trackingId = postId;

    // Start observing
    this.observer.observe(postElement);
  }

  /**
   * Stop observing a post element
   * @param {HTMLElement} postElement - The post DOM element
   */
  unobservePost(postElement) {
    if (this.observer) {
      this.observer.unobserve(postElement);
    }
  }

  /**
   * Start tracking time for a post
   * @param {HTMLElement} postElement - The post DOM element
   */
  startTracking(postElement) {
    const postId = postElement.dataset.trackingId;
    if (!postId) return;

    // If already tracking a different post, stop it first
    if (this.activePost && this.activePost !== postId) {
      const oldElement = document.querySelector(`[data-tracking-id="${this.activePost}"]`);
      if (oldElement) {
        this.stopTracking(oldElement);
      }
    }

    this.activePost = postId;
    this.startTime = Date.now();

    console.log('Started tracking:', postId);
  }

  /**
   * Stop tracking time for a post
   * @param {HTMLElement} postElement - The post DOM element
   */
  stopTracking(postElement) {
    const postId = postElement.dataset.trackingId;

    if (!postId || !this.activePost || this.activePost !== postId) {
      return;
    }

    if (!this.startTime) return;

    // Calculate duration
    const duration = Date.now() - this.startTime;

    // Add to cumulative duration
    const currentDuration = this.durations.get(postId) || 0;
    const newDuration = currentDuration + duration;
    this.durations.set(postId, newDuration);

    console.log(`Stopped tracking ${postId}: +${duration}ms (total: ${newDuration}ms)`);

    // Check if threshold reached
    if (newDuration >= this.threshold && currentDuration < this.threshold) {
      this.onThresholdReached(postElement, postId, newDuration);
    }

    // Reset active tracking
    this.activePost = null;
    this.startTime = null;
  }

  /**
   * Pause tracking (when tab hidden)
   */
  pauseTracking() {
    if (this.activePost && this.startTime) {
      const duration = Date.now() - this.startTime;
      const currentDuration = this.durations.get(this.activePost) || 0;
      this.durations.set(this.activePost, currentDuration + duration);
      this.startTime = null;
      console.log('Tracking paused');
    }
  }

  /**
   * Resume tracking (when tab visible again)
   */
  resumeTracking() {
    if (this.activePost && !this.startTime) {
      this.startTime = Date.now();
      console.log('Tracking resumed');
    }
  }

  /**
   * Get cumulative duration for a post
   * @param {string} postId - Post identifier
   * @returns {number} Duration in milliseconds
   */
  getDuration(postId) {
    let duration = this.durations.get(postId) || 0;

    // If currently tracking this post, add the ongoing duration
    if (this.activePost === postId && this.startTime) {
      duration += Date.now() - this.startTime;
    }

    return duration;
  }

  /**
   * Called when a post reaches the viewing threshold
   * @param {HTMLElement} postElement - The post DOM element
   * @param {string} postId - Post identifier
   * @param {number} duration - Total duration viewed
   */
  onThresholdReached(postElement, postId, duration) {
    console.log(`Threshold reached for ${postId}: ${duration}ms`);

    // Dispatch custom event
    const event = new CustomEvent('time-threshold-reached', {
      detail: {
        postElement,
        postId,
        duration
      }
    });

    window.dispatchEvent(event);
  }

  /**
   * Set the threshold time
   * @param {number} milliseconds - Threshold in milliseconds
   */
  setThreshold(milliseconds) {
    this.threshold = milliseconds;
    console.log('Threshold set to:', milliseconds, 'ms');
  }

  /**
   * Clear duration data for a post
   * @param {string} postId - Post identifier
   */
  clearDuration(postId) {
    this.durations.delete(postId);
  }

  /**
   * Clear all duration data
   */
  clearAllDurations() {
    this.durations.clear();
  }

  /**
   * Get all tracked durations
   * @returns {Map} Map of postId -> duration
   */
  getAllDurations() {
    return new Map(this.durations);
  }

  /**
   * Cleanup and disconnect observer
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.activePost = null;
    this.startTime = null;
    this.durations.clear();

    console.log('TimeTracker destroyed');
  }
}

// Create global instance
window.timeTracker = new TimeTracker();
