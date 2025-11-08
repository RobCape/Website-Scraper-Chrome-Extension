# Architecture Documentation

## Overview

Website Scraper Pro is a Chrome extension built with vanilla JavaScript that scrapes websites and organizes content hierarchically. It uses Chrome Extension Manifest V3 and implements a modular architecture with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Popup UI                             │
│  (popup.html, popup.js, popup.css)                          │
│  - User interface                                            │
│  - Configuration input                                       │
│  - Progress display                                          │
└─────────────────┬───────────────────────────────────────────┘
                  │ chrome.runtime.sendMessage
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  Background Service Worker                   │
│  (background.js)                                             │
│  - Orchestrates scraping process                            │
│  - Manages state                                             │
│  - Coordinates all modules                                   │
└─────┬────────┬────────┬────────┬───────────────────────────┘
      │        │        │        │
      │        │        │        │
┌─────▼─────┐  │  ┌─────▼─────┐  │  ┌──────────────────┐
│  Crawler  │  │  │Screenshot │  │  │ Content Script   │
│  Engine   │  │  │  Handler  │  │  │ (content.js)     │
│           │  │  │           │  │  │ - Page extraction│
└───────────┘  │  └───────────┘  │  └──────────────────┘
               │                 │
         ┌─────▼─────┐     ┌─────▼─────┐
         │   File    │     │   Asset   │
         │ Organizer │     │ Downloader│
         └───────────┘     └───────────┘
```

## Components

### 1. Popup UI (src/popup/)

**Purpose**: User interface for configuring and monitoring scraping

**Files**:
- `popup.html` - Structure
- `popup.css` - Styling
- `popup.js` - Logic and communication

**Key Features**:
- Auto-fill current tab URL
- Collapsible settings panel
- Real-time progress tracking
- Status message logging
- Results display

**Communication**:
- Sends messages to background worker via `chrome.runtime.sendMessage`
- Listens for progress updates via `chrome.runtime.onMessage`

### 2. Background Service Worker (src/background/)

**Purpose**: Main coordinator and state manager

**File**: `background.js`

**Key Responsibilities**:
- Initialize scraping process
- Manage scraping tab lifecycle
- Coordinate crawler, screenshot handler, and organizer
- Handle message routing
- Implement crawl queue processing
- Error handling and recovery

**Key Classes**:
- `ScraperService` - Main service class

**Key Methods**:
- `startScraping(config)` - Initialize and start scraping
- `crawlPages()` - Process crawl queue
- `scrapePage(url, depth)` - Scrape individual page
- `cancelScraping()` - Cancel active scraping
- `cleanup()` - Clean up resources

**State Management**:
- Stores state in `chrome.storage.local`
- Tracks progress for potential resume (future feature)

### 3. Content Script (src/content/)

**Purpose**: Extract data from web pages

**File**: `content.js`

**Key Features**:
- Metadata extraction (title, description, H1s, word count)
- Navigation structure detection
- Link discovery
- Asset URL collection (images, CSS, JS, fonts)
- Color palette extraction
- Font detection
- HTML source capture

**Key Classes**:
- `PageExtractor` - Main extraction class

**Key Methods**:
- `extractAll()` - Extract all data at once
- `extractMetadata()` - Page metadata
- `extractNavigation()` - Nav menu structure
- `extractLinks()` - All internal links
- `extractAssets()` - All asset URLs
- `extractColorPalette()` - Color analysis
- `extractFonts()` - Font analysis

**Communication**:
- Listens for `extractPageData` message
- Returns extracted data via `sendResponse`

### 4. Crawler Engine (src/utils/crawler.js)

**Purpose**: Manage crawl queue and site structure

**Key Features**:
- Breadth-first search algorithm
- URL deduplication
- Depth limiting
- Exclusion pattern matching
- Site hierarchy building
- Sitemap generation

**Key Classes**:
- `Crawler` - Main crawler class

**Key Methods**:
- `initialize()` - Set up with start URL
- `getNext()` - Get next URL from queue
- `hasNext()` - Check if more URLs exist
- `markVisited(url)` - Mark URL as processed
- `addLinks(currentUrl, links, depth)` - Add discovered links
- `isExcluded(url)` - Check exclusion patterns
- `normalizeUrl(url)` - URL normalization
- `buildHierarchy()` - Build tree structure
- `generateSitemap()` - Create sitemap.json

**Data Structures**:
- `queue` - Array of URLs to process (BFS)
- `visited` - Set of processed URLs
- `siteMap` - Map of all discovered URLs with metadata

**Algorithm**:
1. Start with initial URL in queue
2. Process URLs in FIFO order (BFS)
3. Extract links from each page
4. Add unvisited internal links to queue
5. Respect max depth and exclusion patterns
6. Continue until queue is empty or cancelled

### 5. Screenshot Handler (src/utils/screenshot.js)

**Purpose**: Capture page screenshots at different viewports

**Key Features**:
- Desktop view capture (1920px)
- Mobile view capture (375px)
- Full-page screenshot attempts
- Fallback mechanisms
- Chrome DevTools Protocol usage

**Key Classes**:
- `ScreenshotHandler` - Main screenshot class

**Key Methods**:
- `captureTab(tabId, url, options)` - Capture both views
- `captureDesktopView(tabId, url)` - Desktop screenshot
- `captureMobileView(tabId, url)` - Mobile screenshot
- `captureFullPage(tabId, width, height)` - Full page capture
- `captureSimple(tabId)` - Fallback simple capture

**Technical Details**:
- Uses `chrome.debugger` API for viewport manipulation
- Uses `chrome.debugger.sendCommand` with DevTools Protocol
- Commands: `Emulation.setDeviceMetricsOverride`, `Page.captureScreenshot`
- Fallback to `chrome.tabs.captureVisibleTab` if debugger fails

**Limitations**:
- Full stitching not implemented (returns top portion)
- Some sites block screenshot capture
- Requires debugger permission

### 6. File Organizer (src/utils/organizer.js)

**Purpose**: Manage output structure and file downloads

**Key Features**:
- Folder structure creation
- File download management
- Path generation from URLs
- Metadata generation
- Download tracking

**Key Classes**:
- `FileOrganizer` - Main organizer class

**Key Methods**:
- `getPageFolderPath(url)` - Get folder path for URL
- `downloadPageHtml(url, html)` - Save HTML file
- `downloadPageMetadata(url, metadata)` - Save metadata JSON
- `downloadScreenshot(url, base64Data, type)` - Save screenshot
- `downloadAsset(assetUrl, assetType)` - Download asset
- `downloadSitemap(sitemapData)` - Save sitemap.json
- `downloadMetadata(metadata)` - Save metadata.json
- `generateSummaryMetadata()` - Create summary

**Output Structure**:
```
domain_timestamp/
├── sitemap.json
├── metadata.json
├── assets/
│   ├── images/
│   ├── css/
│   ├── js/
│   └── fonts/
└── [page-folders]/
    ├── screenshot-desktop.png
    ├── screenshot-mobile.png
    ├── index.html
    └── page-metadata.json
```

**URL to Path Mapping**:
- `https://example.com/` → `home/`
- `https://example.com/about/` → `about/`
- `https://example.com/products/widget/` → `products/widget/`

### 7. Asset Downloader (src/utils/downloader.js)

**Purpose**: Download and deduplicate page assets

**Key Features**:
- Asset deduplication
- Concurrent download management
- Type-based organization
- Statistics tracking

**Key Classes**:
- `AssetDownloader` - Main downloader class

**Key Methods**:
- `addAssetsFromPage(pageData)` - Add page assets to queue
- `addAssetToQueue(url, type)` - Queue single asset
- `processQueue()` - Process download queue
- `downloadAsset(url, type)` - Download single asset
- `normalizeAssetUrl(url)` - Deduplicate by normalizing

**Download Strategy**:
- Queue-based system
- Concurrent download limit (3 simultaneous)
- Deduplication by normalized URL
- Type-based folder organization
- Error handling (failed downloads don't block others)

**Asset Types**:
- Images: jpg, jpeg, png, gif, svg, webp, ico, bmp
- CSS: css
- Scripts: js, mjs
- Fonts: woff, woff2, ttf, otf, eot

## Data Flow

### Scraping Flow

1. **User initiates scraping**:
   - User configures settings in popup
   - Clicks "Start Scraping"
   - Popup sends message to background worker

2. **Background worker initializes**:
   - Creates Crawler, FileOrganizer, AssetDownloader
   - Opens new tab for scraping
   - Initializes crawler with start URL

3. **Crawling loop** (for each URL in queue):
   - Navigate to URL in scraping tab
   - Wait for page load
   - Send message to content script
   - Content script extracts all data
   - Background receives extracted data
   - Capture screenshots (if enabled)
   - Download HTML and metadata
   - Add assets to download queue
   - Crawler adds discovered links to queue
   - Update progress
   - Apply crawl delay
   - Repeat

4. **Asset downloading**:
   - Process asset download queue
   - Download with concurrency limit
   - Deduplicate by URL
   - Organize by type

5. **Finalization**:
   - Generate sitemap.json
   - Generate metadata.json
   - Wait for downloads to complete
   - Close scraping tab
   - Send completion message to popup

### Message Flow

```
Popup → Background:
  - startScraping: Begin scraping with config
  - cancelScraping: Stop active scraping
  - getStatus: Query current status
  - openFolder: Request to open output folder

Background → Popup:
  - progress: Update progress stats
  - status: Status message for log
  - complete: Scraping completed successfully
  - error: Error occurred
  - cancelled: Scraping was cancelled

Background → Content Script:
  - extractPageData: Request page extraction

Content Script → Background:
  - Response with extracted data or error
```

## State Management

### Popup State
- Managed in `PopupController` class
- Local state only (not persisted)
- Syncs with background worker on open

### Background State
- Managed in `ScraperService` class
- Key state:
  - `isRunning` - Boolean flag
  - `config` - Current scraping configuration
  - `progress` - Progress statistics
  - `crawler` - Crawler instance
  - `organizer` - FileOrganizer instance
  - `downloader` - AssetDownloader instance
  - `scrapingTab` - Tab object for scraping

### Persistent State
- Stored in `chrome.storage.local`
- Keys:
  - `scraperSettings` - User settings
  - `scraperState` - Current scraping state (for recovery)
  - `lastOutputFolder` - Most recent output location

## Error Handling

### Levels of Error Handling

1. **Component Level**:
   - Try-catch in individual methods
   - Graceful degradation (e.g., screenshot failure doesn't stop scraping)
   - Error logging to console

2. **Service Level**:
   - Try-catch in main service methods
   - Error messages sent to popup
   - Cleanup on error

3. **User Level**:
   - Error section in popup UI
   - Descriptive error messages
   - Status message logging

### Common Errors

- **Page load timeout**: 30s timeout, skip page and continue
- **Screenshot capture failure**: Log warning, continue without screenshots
- **Asset download failure**: Log error, continue with other assets
- **Content script injection failure**: Try next page
- **Tab closed unexpectedly**: Cancel scraping

## Performance Considerations

### Optimization Strategies

1. **Concurrent Operations**:
   - Screenshots captured asynchronously
   - Assets downloaded with concurrency limit (3)
   - Queue-based processing

2. **Memory Management**:
   - Clear references after processing
   - Don't store full HTML in memory
   - Stream downloads to disk

3. **Network Efficiency**:
   - Configurable crawl delay
   - Asset deduplication
   - Reuse single scraping tab

4. **User Experience**:
   - Real-time progress updates
   - Cancellation support
   - Background processing (popup can close)

### Scalability Limits

- **Small sites** (< 100 pages): Fast, full featured
- **Medium sites** (100-1000 pages): 10-30 minutes
- **Large sites** (> 1000 pages): May take hours, consider depth limit

## Security Considerations

### Permissions

- All permissions justified and documented
- Minimal permission scope where possible
- User informed of permissions via INSTALL.md

### Data Privacy

- All processing local (no external servers)
- No telemetry or tracking
- User controls all data

### Safe Practices

- URL validation before scraping
- Exclusion patterns for sensitive areas
- Respect robots.txt (basic implementation)
- Rate limiting via crawl delay

## Future Enhancements

### Planned Features

1. **Resume capability**: Save state and resume interrupted scraping
2. **Better screenshot stitching**: Full-page captures with canvas
3. **Robots.txt parser**: More comprehensive robots.txt support
4. **Export options**: ZIP archive creation, different formats
5. **Selective scraping**: Choose specific sections/selectors
6. **Comparison mode**: Compare two scraping sessions
7. **Performance metrics**: Load times, resource sizes
8. **Responsive testing**: Multiple viewport sizes

### Architecture Improvements

1. **Worker pool**: Multiple tabs for parallel scraping
2. **IndexedDB storage**: Better state management for large sites
3. **Incremental updates**: Update existing scrapes
4. **Plugin system**: Allow custom extractors
5. **Testing suite**: Unit and integration tests

## Testing

### Manual Testing Checklist

1. **Installation**: Load unpacked, verify no errors
2. **Basic scraping**: Scrape a small site (5-10 pages)
3. **Settings**: Test each configuration option
4. **Exclusion patterns**: Verify patterns work correctly
5. **Screenshots**: Check both desktop and mobile
6. **Asset downloading**: Verify assets are saved
7. **Cancellation**: Test cancel during scraping
8. **Error handling**: Test with invalid URLs, unreachable sites
9. **Large sites**: Test with depth limits on large sites
10. **Output validation**: Verify folder structure and files

### Test Sites

- **Simple**: Single page HTML site
- **Medium**: Multi-page blog (10-20 pages)
- **Complex**: E-commerce site with many links
- **JavaScript-heavy**: SPA to test limitations

## Development

### Setup

1. Clone repository
2. No build process (vanilla JS)
3. Load in Chrome developer mode
4. Make changes and reload extension

### Debugging

- **Popup**: Right-click popup → Inspect
- **Background**: chrome://extensions → Inspect service worker
- **Content Script**: Open DevTools on page, check console

### Code Style

- Use ES6+ features
- Async/await for promises
- Clear naming conventions
- Comprehensive error handling
- Detailed comments

### Module System

- ES6 modules (`import`/`export`)
- Clear module boundaries
- Avoid circular dependencies

## Troubleshooting

### Development Issues

1. **Module loading errors**: Check service worker type is "module" in manifest
2. **Permission errors**: Verify all permissions in manifest
3. **Content script not injecting**: Check matches pattern in manifest
4. **Downloads not working**: Check downloads permission

### Common Bugs

1. **Queue never empties**: Check for circular link detection
2. **Screenshots blank**: Verify debugger permission and page load timing
3. **Assets not downloading**: CORS issues, check console
4. **Progress not updating**: Check message passing setup

## Contributing

See main README.md for contribution guidelines.

## License

See LICENSE file for details.
