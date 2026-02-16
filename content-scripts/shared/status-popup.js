// Status Popup Manager - Displays non-intrusive popups on the page
// Supports multiple concurrent popups stacked vertically

class StatusPopupManager {
  constructor() {
    this.activePopups = []; // Array of active popup elements
    this.MAX_POPUPS = 3; // Maximum visible popups before oldest gets dismissed
    this.GAP = 10; // Gap between stacked popups (px)
    this.BASE_BOTTOM = 20; // Base bottom offset (px)
  }

  /**
   * Show a status popup with a message
   * @param {Object} status - Status object
   */
  show(status) {
    // Dismiss oldest popups if at max capacity
    while (this.activePopups.length >= this.MAX_POPUPS) {
      this._dismiss(this.activePopups[0]);
    }

    const popup = this._createPopup();
    const { success, saveSuccess, interactionType, platform, categories, aiProcessed, aiFailureReason } = status;

    const isSaveSuccess = saveSuccess !== undefined ? saveSuccess : success;
    const isUncategorized = categories && categories.length === 1 && categories[0] === 'Uncategorized';
    const isPending = categories && categories.length === 1 && (categories[0] === 'Pending...' || categories[0] === 'Pending');

    // Determine AI status
    let aiStatus = '';
    let aiStatusClass = '';

    if (isPending) {
      aiStatus = '⏳ AI Categorization: Processing...';
      aiStatusClass = 'pending';
    } else if (aiFailureReason) {
      aiStatus = `⚠️ AI Categorization Failed: ${aiFailureReason}`;
      aiStatusClass = 'failed';
    } else if (isUncategorized && !aiProcessed) {
      aiStatus = '⚠️ AI Categorization: No API key configured';
      aiStatusClass = 'failed';
    } else if (isUncategorized && aiProcessed) {
      aiStatus = '⚠️ AI Categorization: Could not determine categories';
      aiStatusClass = 'failed';
    } else if (aiProcessed) {
      aiStatus = '✓ AI Categorization: Complete';
      aiStatusClass = 'success';
    } else {
      aiStatus = '⏳ AI Categorization: Pending';
      aiStatusClass = 'pending';
    }

    let title = isSaveSuccess ? '✓ Saved!' : '✗ Failed to Save';
    let message = `${interactionType.charAt(0).toUpperCase() + interactionType.slice(1)} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;

    let categoryInfo = '';
    if (!isPending && !isUncategorized && categories && categories.length > 0) {
      categoryInfo = `Categories: ${categories.join(', ')}`;
    }

    popup.className = 'ct-status-popup';
    popup.classList.add(isSaveSuccess ? 'ct-status-popup--success' : 'ct-status-popup--failure');

    popup.innerHTML = `
      <div class="ct-status-popup__title">${title}</div>
      <div class="ct-status-popup__message">${message}</div>
      ${categoryInfo ? `<div class="ct-status-popup__category-info">${categoryInfo}</div>` : ''}
      <div class="ct-status-popup__ai-status ct-status-popup__ai-status--${aiStatusClass}">${aiStatus}</div>
    `;

    popup.addEventListener('click', () => this._dismiss(popup));
    document.body.appendChild(popup);

    // Track this popup
    this.activePopups.push(popup);

    // Recalculate all popup positions
    this._repositionAll();

    // Animate in
    requestAnimationFrame(() => {
      popup.classList.add('ct-status-popup--visible');
    });

    // Auto-dismiss after 5 seconds
    const timeout = setTimeout(() => this._dismiss(popup), 5000);
    popup._hideTimeout = timeout;
  }

  /**
   * Update an existing popup (e.g., when AI categorization completes after save)
   * If no existing popup found, creates a new one
   */
  update(status) {
    // For updates (like AI completion), just show a new popup
    // The old one will auto-dismiss on its own
    this.show(status);
  }

  /**
   * Dismiss a specific popup with animation
   */
  _dismiss(popup) {
    if (!popup || popup._dismissing) return;
    popup._dismissing = true;
    if (popup._hideTimeout) clearTimeout(popup._hideTimeout);

    // Immediately remove from active tracking so MAX_POPUPS works correctly
    const idx = this.activePopups.indexOf(popup);
    if (idx !== -1) this.activePopups.splice(idx, 1);

    popup.classList.remove('ct-status-popup--visible');
    popup.classList.add('ct-status-popup--dismissing');

    this._repositionAll();

    setTimeout(() => {
      if (popup.parentElement) popup.parentElement.removeChild(popup);
    }, 300); // Match CSS transition duration
  }

  /**
   * Hide all popups (backward-compatible)
   */
  hide() {
    [...this.activePopups].forEach(p => this._dismiss(p));
  }

  /**
   * Recalculate `bottom` for all active popups so they stack vertically
   */
  _repositionAll() {
    // Check if the auto-scroll overlay is present and get its height
    let baseOffset = this.BASE_BOTTOM;
    const overlay = document.querySelector('.ct-auto-scroll-overlay');
    if (overlay) {
      const overlayRect = overlay.getBoundingClientRect();
      const overlayBottomOffset = window.innerHeight - overlayRect.top;
      if (overlayBottomOffset > 0) {
        baseOffset = overlayBottomOffset + this.GAP;
      }
    }

    let currentBottom = baseOffset;
    // Stack from bottom to top: oldest popup is at the bottom, newest at the top
    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const popup = this.activePopups[i];
      if (!popup.parentElement) continue;
      popup.style.bottom = `${currentBottom}px`;
      currentBottom += popup.offsetHeight + this.GAP;
    }
  }

  /**
   * Create a popup DOM element
   */
  _createPopup() {
    const popup = document.createElement('div');
    popup.classList.add('ct-status-popup');
    return popup;
  }
}

// Ensure global access
if (typeof window !== 'undefined') {
  window.StatusPopupManager = StatusPopupManager;
  window.statusPopupManager = new StatusPopupManager();
}