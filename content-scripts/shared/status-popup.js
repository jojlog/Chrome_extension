// Status Popup Manager - Displays non-intrusive popups on the page

class StatusPopupManager {
  constructor() {
    this.popupElement = null;
    this.hideTimeout = null;
  }

  /**
   * Show a status popup with a message
   * @param {Object} status - Status object { success, saveSuccess, message, type, platform, categories, aiProcessed, aiFailureReason }
   */
  show(status) {
    if (!this.popupElement) {
      this.createPopupElement();
    }

    const { success, saveSuccess, interactionType, platform, categories, aiProcessed, aiFailureReason } = status;

    // Determine if save was successful (use saveSuccess if provided, otherwise fall back to success)
    const isSaveSuccess = saveSuccess !== undefined ? saveSuccess : success;

    // Check if categories is only "Uncategorized" - this means AI didn't really categorize
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

    // Title based on SAVE success, not categorization
    let title = isSaveSuccess ? '✓ Saved!' : '✗ Failed to Save';
    let message = `${interactionType.charAt(0).toUpperCase() + interactionType.slice(1)} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;

    // Only show categories if not pending and not just "Uncategorized"
    let categoryInfo = '';
    if (!isPending && !isUncategorized && categories && categories.length > 0) {
      categoryInfo = `Categories: ${categories.join(', ')}`;
    }

    this.popupElement.className = 'ct-status-popup';
    if (isSaveSuccess) {
      this.popupElement.classList.add('ct-status-popup--success');
    } else {
      this.popupElement.classList.add('ct-status-popup--failure');
    }

    this.popupElement.innerHTML = `
      <div class="ct-status-popup__title">${title}</div>
      <div class="ct-status-popup__message">${message}</div>
      ${categoryInfo ? `<div class="ct-status-popup__category-info">${categoryInfo}</div>` : ''}
      <div class="ct-status-popup__ai-status ct-status-popup__ai-status--${aiStatusClass}">${aiStatus}</div>
    `;

    document.body.appendChild(this.popupElement);
    this.popupElement.classList.add('ct-status-popup--visible');

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 5000); // Hide after 5 seconds
  }

  /**
   * Hide the status popup
   */
  hide() {
    if (this.popupElement) {
      this.popupElement.classList.remove('ct-status-popup--visible');
      // Remove from DOM after transition if needed, or just keep it hidden
      // For simplicity, we'll keep it in DOM but hidden.
    }
  }

  /**
   * Create the popup DOM element
   */
  createPopupElement() {
    this.popupElement = document.createElement('div');
    this.popupElement.id = 'content-tracker-status-popup';
    this.popupElement.classList.add('ct-status-popup'); // Base class
    this.popupElement.addEventListener('click', () => this.hide()); // Allow closing by clicking
  }
}

window.statusPopupManager = new StatusPopupManager();