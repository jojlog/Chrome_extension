/**
 * Notification Manager
 * Manages vertical stacking of fixed-position notifications to prevent overlaps
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.baseTop = 80; // Starting position from top (px)
        this.gap = 16; // Gap between notifications (px)
    }

    /**
     * Register a notification element for vertical stacking
     * @param {HTMLElement} element - The notification element to register
     * @returns {Function} Cleanup function to unregister the element
     */
    register(element) {
        if (!this.notifications.includes(element)) {
            this.notifications.push(element);
            this.reposition();
        }
        return () => this.unregister(element);
    }

    /**
     * Unregister a notification element
     * @param {HTMLElement} element - The notification element to unregister
     */
    unregister(element) {
        const index = this.notifications.indexOf(element);
        if (index > -1) {
            this.notifications.splice(index, 1);
            this.reposition();
        }
    }

    /**
     * Reposition all registered notifications vertically
     */
    reposition() {
        let currentTop = this.baseTop;

        this.notifications.forEach(notification => {
            // Only reposition visible notifications
            if (!notification.classList.contains('hidden')) {
                notification.style.top = `${currentTop}px`;
                const height = notification.offsetHeight;
                currentTop += height + this.gap;
            }
        });
    }

    /**
     * Force reposition (useful after DOM changes)
     */
    refresh() {
        this.reposition();
    }
}

// Create global instance
const notificationManager = new NotificationManager();
