# Website-Scraper-Chrome-Extension
A powerful Chrome extension that intelligently scrapes and archives entire websites, organizing content hierarchically for web developers rebuilding or redesigning sites.

# Website Scraper Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)

> A powerful Chrome extension that intelligently scrapes and archives entire websites, organizing content hierarchically for web developers rebuilding or redesigning sites.

## 🎯 Problem

Web developers working on website redesigns or rebuilds waste hours manually documenting existing sites: clicking through every page, taking screenshots, downloading assets, and mapping site structure. This process is tedious, error-prone, and often incomplete.

## 💡 Solution

This Chrome extension automates the entire website documentation process. With one click, it crawls a website, captures screenshots of every page, downloads all assets, and organizes everything in a hierarchical folder structure that mirrors the site's navigation.

## ✨ Features

### Core Functionality
- 🕷️ **Intelligent Crawling** - Automatically discovers and maps all pages by following internal links
- 📸 **Full-Page Screenshots** - Captures complete desktop and mobile views (not just viewport)
- 📁 **Smart Organization** - Creates folder structure matching site navigation hierarchy
- 🎨 **Asset Extraction** - Downloads images, CSS, JS, fonts, and other resources
- 📊 **Metadata Generation** - Creates detailed sitemap and page-level metadata (colors, fonts, structure)
- ⚡ **Respects Best Practices** - Rate limiting, robots.txt compliance, timeout handling

### Advanced Features
- 🔄 **SPA Support** - Handles JavaScript-rendered single-page applications
- 🎛️ **Configurable Settings** - Control depth, exclusions, delays, and screenshot options
- 📈 **Real-Time Progress** - Live dashboard showing crawl status and pages processed
- 🚫 **URL Exclusions** - Skip admin pages, login forms, or specific patterns
- 💾 **Export Options** - Generate ZIP archives or browsable HTML index

## 🚀 Quick Start

### Prerequisites
- Chrome/Chromium browser (version 88+)
- Node.js 16+ (for development)
- Basic understanding of Chrome extensions

### Installation

#### For Users (Production)
1. Download from [Chrome Web Store](#) (coming soon)
2. Click "Add to Chrome"
3. Pin extension to toolbar for easy access

#### For Developers (Local Development)
```bash
# Clone the repository
git clone https://github.com/yourusername/website-scraper-extension.git
cd website-scraper-extension

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Navigate to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the /dist folder
```

## 📖 Usage

### Basic Scraping

1. **Navigate** to the website you want to scrape
2. **Click** the extension icon in your toolbar
3. **Verify** the URL is correct (pre-filled from current tab)
4. **Click** "Start Scraping"
5. **Monitor** progress in the popup dashboard
6. **Open** the output folder when complete

### Advanced Configuration

#### Settings Panel
Access via the gear icon in the extension popup:

```
Max Crawl Depth: 5 levels (recommended for most sites)
Crawl Delay: 500ms between requests (respect server load)
Screenshots: Desktop (1920px) + Mobile (375px)
Exclude Patterns: /admin/*, /login, /checkout/*
Asset Downloads: Images ✓, CSS/JS ✓, Fonts ✓
```

#### URL Exclusion Examples
```
Exclude all blog tags: /blog/tag/*
Exclude admin pages: /admin/*
Exclude user profiles: /user/*/profile
Exclude query parameters: *?utm_*
```

## 📂 Output Structure

The extension creates a timestamped folder with the following structure:

```
example-com_2025-11-08_14-30/
├── sitemap.json              # Complete site map with hierarchy
├── metadata.json             # Scrape summary and statistics
├── index.html                # Browsable interface (optional)
├── assets/                   # All downloaded assets
│   ├── images/
│   ├── css/
│   ├── js/
│   └── fonts/
├── home/
│   ├── screenshot-desktop.png
│   ├── screenshot-mobile.png
│   ├── index.html            # Raw HTML source
│   └── page-metadata.json    # Page-specific data
└── about/
    ├── screenshot-desktop.png
    ├── screenshot-mobile.png
    ├── index.html
    ├── page-metadata.json
    └── team/
        ├── screenshot-desktop.png
        ├── screenshot-mobile.png
        ├── index.html
        └── page-metadata.json
```

### File Descriptions

**sitemap.json** - Complete site structure and navigation hierarchy
```json
{
  "domain": "example.com",
  "scrapedAt": "2025-11-08T14:30:00Z",
  "totalPages": 47,
  "totalAssets": 324,
  "structure": [...]
}
```

**page-metadata.json** - Individual page details
```json
{
  "url": "https://example.com/about",
  "title": "About Us | Example",
  "metaDescription": "Learn about our company...",
  "h1": ["About Us"],
  "wordCount": 850,
  "images": 5,
  "colorPalette": ["#FF5733", "#3498DB"],
  "fonts": ["Open Sans", "Roboto"]
}
```

## 🛠️ Development

### Project Structure
```
website-scraper-extension/
├── src/
│   ├── background/        # Background service worker
│   ├── content/           # Content scripts
│   ├── popup/             # Extension popup UI
│   ├── utils/             # Shared utilities
│   └── manifest.json      # Extension manifest
├── dist/                  # Built extension (generated)
├── tests/                 # Test suites
└── docs/                  # Documentation
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

### Tech Stack

- **Manifest Version**: V3
- **Language**: TypeScript
- **Build Tool**: Webpack/Vite
- **UI Framework**: React (for popup)
- **Storage**: IndexedDB + Chrome Storage API
- **Testing**: Jest + Chrome Extension Testing Library

## 🏗️ Architecture

### Key Components

1. **Background Service Worker** (`background.js`)
   - Coordinates crawling process
   - Manages download queue
   - Handles state persistence

2. **Content Script** (`content.js`)
   - Injects into target pages
   - Extracts page content and metadata
   - Captures screenshots

3. **Popup UI** (`popup.html/js`)
   - User interface and controls
   - Settings management
   - Progress monitoring

4. **Crawler Engine** (`crawler.js`)
   - URL discovery and queue management
   - Breadth-first search algorithm
   - Duplicate detection

5. **Screenshot Handler** (`screenshot.js`)
   - Full-page capture logic
   - Responsive viewport handling
   - Image optimization

6. **File Organizer** (`organizer.js`)
   - Folder structure generation
   - Asset deduplication
   - Metadata compilation

### Data Flow

```
User Action → Popup UI → Background Worker → Content Script → Target Website
                ↓              ↓                    ↓
           Settings      Crawler Engine      Page Content
                ↓              ↓                    ↓
           Storage        Download Queue     Screenshots
                ↓              ↓                    ↓
                      File Organizer
                             ↓
                    Local File System
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- crawler.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Structure
```
tests/
├── unit/              # Unit tests for individual modules
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
└── fixtures/         # Test data and mock sites
```

## 📋 Roadmap

### Version 1.0 (MVP)
- [x] Basic crawling functionality
- [x] Screenshot capture (desktop)
- [x] Folder organization
- [ ] Asset downloading
- [ ] Metadata generation
- [ ] Settings panel
- [ ] Progress tracking

### Version 1.1
- [ ] Mobile screenshots
- [ ] SPA support (JavaScript execution)
- [ ] Advanced URL exclusions
- [ ] Export to ZIP
- [ ] Error reporting and retry logic

### Version 2.0
- [ ] Interactive state capture (dropdowns, modals)
- [ ] Authentication support
- [ ] Incremental updates (re-scrape detection)
- [ ] Cloud storage integration
- [ ] Comparison mode (visual diffs)

### Future Considerations
- [ ] Firefox extension
- [ ] Desktop app version
- [ ] API for programmatic access
- [ ] Team collaboration features
- [ ] AI-powered content analysis

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier configured)
- Write tests for new features
- Update documentation as needed
- Keep commits atomic and well-described
- Ensure all tests pass before submitting PR

### Areas We Need Help

- 🐛 Bug fixes and error handling
- 📱 Mobile screenshot improvements
- 🎨 UI/UX enhancements
- 📝 Documentation improvements
- 🌐 Internationalization (i18n)
- ♿ Accessibility improvements

## 🐛 Known Issues

- Large sites (1000+ pages) may take several minutes to scrape
- Some JavaScript-heavy SPAs may not capture all content
- CORS restrictions prevent downloading some cross-origin assets
- Shadow DOM content may not be fully captured
- Video content is not automatically downloaded (by design)

See [Issues](https://github.com/yourusername/website-scraper-extension/issues) for full list.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by HTTrack and Wayback Machine
- Built with the Chrome Extensions API
- Community feedback and contributions

## 📞 Support

- **Documentation**: [Wiki](https://github.com/yourusername/website-scraper-extension/wiki)
- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/website-scraper-extension/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/website-scraper-extension/discussions)
- **Email**: support@example.com

## ⚖️ Legal & Ethics

**Important**: This tool is intended for legitimate purposes such as:
- Redesigning your own websites
- Archiving sites you have permission to copy
- Competitive analysis of public information
- Educational purposes

**Please respect**:
- Website terms of service
- robots.txt directives
- Copyright and intellectual property rights
- Server resources (use appropriate rate limiting)

**Do NOT use this tool for**:
- Scraping copyrighted content without permission
- Overwhelming servers with aggressive requests
- Collecting private or sensitive information
- Any illegal or unethical purposes

Users are solely responsible for ensuring their use complies with applicable laws and website terms of service.

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/website-scraper-extension?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/website-scraper-extension?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/website-scraper-extension)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/website-scraper-extension)

---

**Made with ❤️ by developers, for developers**

Star ⭐ this repo if you find it helpful!
