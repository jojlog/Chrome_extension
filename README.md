# Social Media Content Tracker - Chrome Extension

A powerful Chrome extension that automatically tracks and categorizes your social media interactions across Instagram, Twitter/X, LinkedIn, and TikTok. Save content you like, bookmark, or retweet, and organize everything with AI-powered categorization.

## Features

- **Auto-Detection**: Automatically captures when you like, save, bookmark, or retweet content
- **Multi-Platform Support**: Works on Instagram, Twitter/X, LinkedIn, and TikTok
- **Time Tracking**: Monitors how long you view posts to identify content worth saving
- **AI Categorization**: Uses OpenAI GPT or Google Gemini to automatically categorize saved content
- **Comprehensive Data Capture**: Saves post text, images, metadata, engagement metrics, and viewing duration
- **Dual Interface**: Quick popup for recent saves + full dashboard for browsing and management
- **Local Storage**: All data stored securely in your browser
- **Export Functionality**: Export your saved content as JSON for backup

## Repository Operations (Monorepo Transition)

- "packages가 원본, ext-chrome inline은 호환 출력"
- "content script import 금지"
- "빌드 도구 도입 전까지 수동 동기화 절차"

### Rules

- Keep shared logic/types/UI in `packages/*` as the source of truth.
- Keep platform-specific behavior in `apps/*` adapter layers.
- Keep active Chrome MV3 content scripts inline-compatible (no direct `import/export` in active entries).
- Before bundler adoption, manually sync compatible outputs for runtime entry files.
- Do not change storage schema/content data unless explicitly required.

## Migration Roadmap

- Parity status: `docs/parity-matrix.md`
- Incremental migration steps: `docs/migration-plan.md`
- MV3 content-script ESM check: `npm run check:mv3-content-script`
- Feature flag sync check: `npm run check:flag-sync`
- Storage sync check: `npm run check:storage-sync`
- Adapter contract check: `npm run check:adapter-contract`
- UI mirror sync check: `npm run check:ui-sync`
- Background mirror sync check: `npm run check:background-sync`
- Manual sync reference: `docs/sync-manual.md`
- Platform adapter notes: `docs/platform-adapters.md`

## Installation

### Load the Extension in Chrome

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `/Users/zone/My Projects/Content Tracker` directory
   - The extension should now appear in your extensions list

4. **Pin the Extension** (Optional)
   - Click the puzzle icon in Chrome toolbar
   - Find "Social Media Content Tracker"
   - Click the pin icon to keep it visible

## Setup

### 1. Configure AI Categorization

The extension uses AI to automatically categorize your saved content. You can use **both OpenAI and Google Gemini API keys** - if both are provided, OpenAI will be tried first, and Gemini will be used as a fallback if OpenAI fails.

#### Option A: OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (format: `sk-proj-...`)

**Cost**: ~$0.0001-0.001 per categorization (~10,000 posts per $1)

#### Option B: Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create an API key
4. Copy the key

**Cost**: Free tier (60 requests/minute), then pay-as-you-go

#### Option C: Using .env File (Advanced)

1. Create a `.env` file in the project root
2. Copy from `.env.example` and add your keys:
   ```
   OPENAI_API_KEY=sk-proj-your-key-here
   GEMINI_API_KEY=your-gemini-key-here
   ```
3. Run build script: `node scripts/build-env.js`
4. Or edit `config/env.js` directly

### 2. Configure Extension Settings

#### Method 1: Via UI (Recommended)

1. Click the extension icon in Chrome toolbar
2. Click "Settings" or open the dashboard and click "Settings"
3. Enter your configuration:
   - **OpenAI API Key**: Paste your OpenAI key (optional)
   - **Google Gemini API Key**: Paste your Gemini key (optional)
   - 💡 **Tip**: If both keys are provided, OpenAI will be tried first, then Gemini as fallback
   - **Time Threshold**: Set minimum viewing time (default: 5 seconds)
   - **Enabled Platforms**: Toggle which platforms to track
4. Click "Save Settings"

#### Method 2: Via .env File

1. Edit `config/env.js` directly with your API keys
2. Or create `.env` file and run: `node scripts/build-env.js`

**Note**: Your API keys are stored locally in your browser and never sent to our servers.

## Usage

### Automatic Tracking

Once installed, the extension automatically works in the background:

1. **Browse Social Media**: Visit Instagram, Twitter, LinkedIn, or TikTok
2. **Interact Normally**: Like, save, bookmark, or retweet posts as usual
3. **Content is Saved**: The extension captures and saves the interaction
4. **AI Categorization**: Content is automatically categorized in the background

### View Saved Content

#### Quick View (Popup)

1. Click the extension icon
2. See statistics and recent saves
3. Click any item to open the original post

#### Dashboard (Full View)

1. Click "Open Dashboard" in the popup
2. Browse all saved content
3. Filter by platform or category
4. Search content
5. Sort by date, engagement, or view duration
6. Toggle between grid and list views

### Manage Content

- **Open Original**: Click any card to open the original post
- **Delete**: Remove unwanted saved content
- **Export**: Download all your data as JSON

## How It Works

### Content Detection

The extension uses multiple techniques to detect your interactions:

- **MutationObserver**: Watches for changes in the DOM to detect new content
- **Event Delegation**: Listens for clicks on like/save/bookmark buttons
- **IntersectionObserver**: Tracks how long you view each post
- **Platform-Specific Selectors**: Uses robust selectors that work even when platforms update their UI

### Time Tracking

The extension tracks how long you view each post:

- Posts are tracked when 50% visible in viewport
- Tracking pauses when you switch tabs
- Cumulative time tracked across multiple scrolls
- Threshold can be customized in settings

### AI Categorization

Background processing automatically categorizes your content:

- Queue-based system to respect API rate limits
- Batch processing (5 items at a time)
- Automatic retry on failures
- Categories: Technology, Business, Health, Entertainment, Sports, and more

### Data Storage

All data is stored locally using Chrome's storage API:

- `unlimitedStorage` permission for unlimited capacity
- No external servers or databases
- Your data never leaves your browser
- Export anytime for backup

## File Structure

```text
Content Tracker/
├── manifest.json                 # Extension configuration
├── background/                   # Active Chrome runtime (legacy path)
├── content-scripts/              # Active Chrome runtime (legacy path)
├── popup/                        # Active Chrome runtime (legacy path)
├── dashboard/                    # Active Chrome runtime (legacy path)
├── lib/                          # Active shared libs (legacy path)
├── apps/                         # Platform layers for migration
│   ├── ext-chrome/
│   ├── ext-safari/
│   ├── web/
│   └── ios-app/
├── packages/                     # Source-of-truth shared modules
│   ├── core/
│   ├── api-types/
│   └── ui/
└── assets/
```

## Troubleshooting

### Extension Not Detecting Interactions

1. **Refresh the page** after installing/updating the extension
2. **Check enabled platforms** in settings
3. **Verify permissions** in `chrome://extensions/`
4. **Open DevTools Console** (F12) and check for errors

### AI Categorization Not Working

1. **Verify API key** is entered correctly in settings
2. **Check API provider** matches your key (OpenAI vs Gemini)
3. **Check API credits/quota** on your provider's dashboard
4. **Open DevTools Console** to see categorization logs

### Content Not Appearing

1. **Reload the extension** on `chrome://extensions/`
2. **Clear browser cache** and reload social media pages
3. **Check storage** - open DevTools → Application → Storage
4. **Verify interactions are being saved** in console logs

### Platform-Specific Issues

Social media platforms frequently update their HTML structure. If detection stops working:

1. Check console for selector errors
2. The extension uses multiple fallback selectors
3. Updates may be needed for new platform designs

## Privacy & Security

- **Local-Only Storage**: All data stored in your browser
- **No Tracking**: No analytics or telemetry
- **No External Servers**: Extension doesn't communicate with any external servers (except AI APIs)
- **User-Controlled API Keys**: You provide your own API keys
- **Open Source Design**: Transparent implementation

## API Costs

### OpenAI (GPT-3.5-Turbo)

- ~$0.0001 - $0.001 per categorization
- 100-500 categorizations per $1
- Most cost-effective option

### Google Gemini

- Free tier: 60 requests per minute
- Very generous for personal use
- May require paid plan for heavy usage

## Limitations

- **Platform Updates**: Social media platforms may change their UI, breaking selectors
- **Rate Limits**: AI categorization respects rate limits (10 requests/minute)
- **Browser-Specific**: Only works in Chrome/Chromium browsers
- **No Mobile Support**: Desktop browser only
- **No Cloud Sync**: Data stored per browser (export/import for backups)

## Future Enhancements

Potential features for future versions:

- Cross-browser sync
- More platforms (Reddit, YouTube, Pinterest)
- Manual categorization and editing
- Collections and folders
- Advanced search and filters
- Analytics and insights
- Reminders to revisit content
- Browser extension for Firefox/Edge

## Development

### Requirements

- Chrome 88+ (Manifest V3 support)
- Node.js and npm (for development tools, optional)
- OpenAI or Google Gemini API key

### Testing

### Repository Checks

```bash
npm run check:repo
npm run check:storage-sync
npm run check:adapter-contract
npm run check:ui-sync
npm run check:background-sync
npm run check:parity
```

1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click refresh icon on the extension
4. Test on social media platforms
5. Check console for errors

### Building Icons

Icons were generated using Python/PIL. To regenerate:

```bash
cd assets/icons
python3 generate_icons.py
```

## Support

For issues, questions, or feature requests:

- Check console logs for errors
- Verify all settings are configured
- Ensure API keys are valid
- Test on a fresh browser profile

## License

This project is for personal use. Modify and extend as needed.

## Credits

Built with:
- Chrome Extension Manifest V3
- Vanilla JavaScript (no frameworks)
- OpenAI GPT / Google Gemini APIs
- Chrome Storage API

---

**Note**: This extension is not affiliated with Instagram, Twitter, LinkedIn, TikTok, OpenAI, or Google. It's a personal productivity tool that works alongside these platforms.

## Version History

### v1.0.0 (Initial Release)
- Auto-detection for Instagram, Twitter, LinkedIn, TikTok
- AI-powered categorization
- Time tracking
- Popup and dashboard interfaces
- Export functionality
- Local storage
