# **Risk Evasion Strategies for SNS Link Scraper (Manifest V3)**

This document outlines technical strategies to avoid account bans and detection while scraping bookmarks and likes from Instagram and Twitter (X) using **Vanilla JavaScript** and **Chrome Extension Manifest V3**.

## **1\. Interaction Strategy: Stealth & Human Mimicry**

To avoid "Automated Behavior" detection, the extension must operate within the user's active session without triggering bot alarms.

* **Human-like Scrolling with Jitter:**  
  * Instead of window.scrollTo(0, document.body.scrollHeight), use a function that scrolls in small, randomized increments.  
  * Add a "Jitter" (random delay) between 800ms to 2500ms between actions.  
  * *Implementation:* Use setTimeout wrapped in a Promise within your async loop.  
* **Event-Driven Extraction:**  
  * Don't scrape the entire page at once. Trigger extraction based on user actions (e.g., when the user scrolls or clicks "Load More").  
  * Use IntersectionObserver to detect when new posts enter the viewport and extract only those specific DOM elements.

## **2\. Extraction Methodology: Network vs. DOM**

Instagram and Twitter frequently change their CSS class names (obfuscation).

* **Network Interception (The Pro Approach):**  
  * Use chrome.debugger or listen to specific fetch calls if possible.  
  * Instead of parsing messy HTML, try to capture the JSON response sent from the server to the browser when the user visits the "Saved" or "Bookmarks" page.  
  * *Advantage:* JSON contains direct IDs and clean URLs, which is 100% accurate and harder to detect than DOM scraping.  
* **Shadow DOM & Obfuscation Handling:**  
  * Since you are using Vanilla JS, use robust selectors like a\[href\*="/p/"\] for Instagram or a\[href\*="/status/"\] for Twitter instead of specific class names like .css-175oi2r.

## **3\. Manifest V3 Service Worker Management**

Service workers in MV3 are ephemeral (they go idle after 30 seconds of inactivity).

* **State Persistence:**  
  * Since the service worker restarts, always store the "last scraped ID" or "progress state" in chrome.storage.local immediately.  
  * Use chrome.alarms if you need to perform periodic background syncs, but keep the frequency low (e.g., once every hour) to avoid being flagged.  
* **Message Passing Reliability:**  
  * Ensure your content-script.js sends data to service-worker.js in small batches. Large data transfers in one go can cause the worker to crash or trigger memory alerts.

## **4\. Rate Limiting & Safety Boundaries**

Platforms track the frequency of data requests per account.

* **Cool-off Periods:**  
  * Implement a "Daily Limit" (e.g., 200 links per day) to stay under the radar.  
  * If the platform returns a 429 Too Many Requests status, your extension should automatically pause all activities for at least 1 hour and notify the user.  
* **Local-First Architecture:**  
  * Perform all data processing (URL cleaning, deduplication) in chrome.storage.local. Avoid sending this data to an external server unless explicitly requested by the user. Platforms monitor suspicious outbound traffic.

## **5\. Security & Privacy (The "Permission" Risk)**

* **Minimal Permissions:** Only request storage and activeTab or specific host permissions (https://\*.instagram.com/\*). Avoid debugger if you can, as it triggers a "This extension is debugging this browser" warning to the user.  
* **No Automated Login:** Never ask for or store passwords. Use the existing Cookie and Session already present in the browser.

### **Summary Table for Development**

| Feature | Risk | Strategy |
| :---- | :---- | :---- |
| **Scrolling** | High (Bot Pattern) | Randomized scroll increments \+ Promise delays. |
| **Data Source** | Medium (Unstable) | Prioritize Network Response Interception over DOM parsing. |
| **Storage** | Low | Use chrome.storage.local exclusively. |
| **Identity** | High | Never store credentials; use the active browser session. |
| **Deployment** | Medium | Use ES Modules in Service Worker for cleaner, maintainable code. |

