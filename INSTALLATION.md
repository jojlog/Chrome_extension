# Installation Guide

## Prerequisites

- Google Chrome (version 88 or later)
- An API key from OpenAI or Google Gemini (for AI categorization)

## Step-by-Step Installation

### 1. Load Extension in Chrome

```
1. Open Chrome
2. Navigate to: chrome://extensions/
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked" button
5. Navigate to: /Users/zone/Chrome_extension
6. Click "Select" or "Open"
```

You should see the extension appear with:
- **Name**: Social Media Content Tracker
- **Icon**: Purple gradient bookmark
- **Status**: Enabled

### 2. Get Your API Key

#### Option A: OpenAI (Recommended)

**Why**: More accurate categorization, consistent API

**Steps**:
1. Go to: https://platform.openai.com/api-keys
2. Create an account or sign in
3. Click "+ Create new secret key"
4. Name it: "Social Media Tracker"
5. Copy the key (format: `sk-proj-...`)

**Pricing**: ~$0.0001 per categorization (~10,000 posts per $1)

#### Option B: Google Gemini

**Why**: Free tier available, 60 requests/minute

**Steps**:
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API key"
4. Select or create a Google Cloud project
5. Copy the key

**Pricing**: Free tier, then pay-as-you-go

### 3. Configure Extension

```
1. Click extension icon (purple bookmark) in Chrome toolbar
   - If not visible: Click puzzle icon → Pin "Social Media Content Tracker"

2. Click "Settings" button in popup

3. Fill in settings:
   - AI Provider: Select "OpenAI" or "Google Gemini"
   - API Key: Paste your key
   - Time Threshold: 5 (seconds - default is good)
   - Enabled Platforms: Keep all checked

4. Click "Save Settings"

5. Close settings modal
```

### 4. Verify Installation

```
Test on Instagram:
1. Go to https://instagram.com
2. Refresh the page (F5)
3. Open browser console (F12)
4. Look for: "Instagram tracker script loaded"
5. Like any post
6. Click extension icon
7. Post should appear in "Recent Saves"

Test on Twitter:
1. Go to https://twitter.com or https://x.com
2. Refresh the page
3. Like or bookmark a tweet
4. Check extension popup
```

## Troubleshooting

### Extension icon not showing?

```
Solution 1: Pin the extension
- Click puzzle icon in Chrome toolbar
- Find "Social Media Content Tracker"
- Click pin icon

Solution 2: Check if enabled
- Go to chrome://extensions/
- Find extension
- Ensure toggle is ON
```

### "Extension loaded" message but nothing happens?

```
Solution: Reload extension
1. Go to chrome://extensions/
2. Find "Social Media Content Tracker"
3. Click circular arrow (reload) icon
4. Refresh social media pages
5. Try interacting again
```

### API key not working?

```
For OpenAI:
- Verify key format: sk-proj-...
- Check usage limits: https://platform.openai.com/usage
- Ensure billing is set up

For Gemini:
- Verify key is for Gemini Pro
- Check API is enabled in Google Cloud
- Test with: https://makersuite.google.com/
```

### Content not being saved?

```
1. Open browser console (F12)
2. Go to Console tab
3. Look for error messages
4. Common issues:
   - "Failed to send message" → Reload extension
   - "Storage quota exceeded" → Export and clear old data
   - "Selector not found" → Platform UI may have changed
```

### Categories not appearing?

```
1. Wait 5 minutes after saving (background processing)
2. Check API key is correct
3. Verify AI provider matches your key
4. Check console for API errors
5. Manually trigger: Click "Refresh" in popup
```

## Permissions Explained

The extension requests these permissions:

| Permission | Why Needed |
|-----------|------------|
| `storage` | Save your content locally |
| `unlimitedStorage` | No 10MB limit on saved content |
| `tabs` | Access tab info for tracking |
| `scripting` | Inject tracking scripts |
| `notifications` | Show save confirmations |
| Host permissions | Access Instagram, Twitter, LinkedIn, TikTok pages |

**All data stays local** - nothing is sent to external servers except AI API calls.

## Uninstallation

To remove the extension:

```
1. Go to chrome://extensions/
2. Find "Social Media Content Tracker"
3. Click "Remove"
4. Confirm removal
```

**Note**: This will delete all saved content. Export first if you want to keep it!

## Next Steps

Once installed and configured:

1. **Browse normally** - Visit Instagram, Twitter, LinkedIn, or TikTok
2. **Interact naturally** - Like, save, bookmark, or retweet posts
3. **Check popup** - Click extension icon to see recent saves
4. **Explore dashboard** - Click "Open Dashboard" for full interface
5. **Export regularly** - Backup your data via Dashboard → Export

## Support Resources

- **Quick Start**: See QUICKSTART.md
- **Full Documentation**: See README.md
- **Project Overview**: See PROJECT_SUMMARY.md
- **Console Logs**: Check F12 → Console for debug info

## Tips for Best Experience

1. **Refresh pages after installation** - Ensures tracker loads
2. **Configure API key immediately** - Get instant categorization
3. **Export monthly** - Keep backups of your data
4. **Check console occasionally** - Catch any errors early
5. **Update selectors if needed** - Platforms change frequently

---

Need help? Check the console logs (F12) and README.md for detailed troubleshooting.
