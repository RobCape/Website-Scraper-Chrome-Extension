# Usage Guide

## Quick Start

1. Click the Website Scraper Pro extension icon in your Chrome toolbar
2. The current tab's URL will auto-fill (or enter a URL manually)
3. Click "Start Scraping" to begin
4. Monitor progress in real-time
5. When complete, check your Downloads folder for the organized output

## Interface Overview

### URL Input
- **Auto-fill**: Click the 📋 button to use the current tab's URL
- **Manual entry**: Type or paste any website URL

### Settings Panel

Click "⚙️ Settings" to expand configuration options:

#### Max Depth (default: 5)
- Controls how deep the crawler will go from the starting page
- Depth 0 = only the starting page
- Depth 1 = starting page + directly linked pages
- Depth 2 = includes pages 2 clicks away
- Higher values = more pages, longer scraping time

#### Crawl Delay (default: 500ms)
- Time to wait between page requests
- Minimum: 100ms (be respectful to servers)
- Recommended: 500-1000ms for production sites
- Higher values = slower scraping, less server load

#### Screenshots
- **Desktop (1920px)**: Captures desktop view
- **Mobile (375px)**: Captures mobile view
- Uncheck to skip screenshot capture and speed up scraping

#### Exclude Patterns
- Comma-separated URL patterns to skip
- Supports wildcards (*)
- Examples:
  - `/blog/*` - Skip all blog pages
  - `*/admin/*` - Skip admin sections
  - `*.pdf` - Skip PDF files
  - `/category/*, /tag/*` - Skip multiple patterns

## During Scraping

### Progress Display

Monitor your scraping session:
- **Progress bar**: Visual representation of completion
- **Pages Processed**: Number of pages completed
- **Total Pages**: Total pages discovered so far
- **Current**: The page currently being scraped
- **Status Messages**: Real-time log of activities

### Cancel Scraping

Click the "Cancel" button to stop scraping at any time:
- Already scraped data will be saved
- Downloads in progress will complete
- The scraping tab will close

## After Scraping

### Success

When scraping completes successfully:
- A success message appears
- View scraping statistics (pages, screenshots, assets)
- Click "Open Output Folder" to view your Downloads folder

### Output Structure

Your scraped content is organized in your Downloads folder:

```
example-com_2025-11-08_14-30/
├── sitemap.json              # Complete site structure
├── metadata.json             # Scraping summary
├── assets/                   # All downloaded assets
│   ├── images/
│   ├── css/
│   ├── js/
│   └── fonts/
├── home/                     # Root page
│   ├── screenshot-desktop.png
│   ├── screenshot-mobile.png
│   ├── index.html
│   └── page-metadata.json
└── about/                    # Nested pages follow URL structure
    └── team/
        ├── screenshot-desktop.png
        ├── screenshot-mobile.png
        ├── index.html
        └── page-metadata.json
```

### Understanding Output Files

#### sitemap.json
- Hierarchical structure of the entire site
- Shows parent-child relationships between pages
- Includes depth information

#### metadata.json
- Scraping session summary
- Total counts (pages, screenshots, assets)
- Timestamp and configuration used
- List of all scraped pages

#### Page Folders
Each page gets its own folder based on URL structure:
- `index.html` - Full page source code
- `page-metadata.json` - Page metadata (title, description, word count, etc.)
- `screenshot-desktop.png` - Desktop view (if enabled)
- `screenshot-mobile.png` - Mobile view (if enabled)

#### page-metadata.json Contents
- Page title
- Meta description
- H1 tags
- Word count
- Image count
- Color palette
- Fonts used
- Open Graph data
- Navigation structure

#### Assets Folder
All assets organized by type:
- **images/** - All images from all pages (deduplicated)
- **css/** - Stylesheets
- **js/** - JavaScript files
- **fonts/** - Web fonts

## Use Cases

### Web Developer Analysis
```
Max Depth: 2-3
Crawl Delay: 500ms
Screenshots: Both enabled
Exclude: None
```
Perfect for analyzing site structure, colors, and fonts.

### Quick Homepage Audit
```
Max Depth: 1
Crawl Delay: 500ms
Screenshots: Desktop only
Exclude: *, /blog/*, /news/*
```
Fast analysis of main landing page and primary links.

### Complete Site Backup
```
Max Depth: 10
Crawl Delay: 1000ms
Screenshots: Both enabled
Exclude: /admin/*, /user/*
```
Full site scraping (can take a long time on large sites).

### Content Research
```
Max Depth: 3
Crawl Delay: 500ms
Screenshots: None
Exclude: None
```
Focus on content extraction without screenshots.

## Best Practices

### Respectful Scraping
- Use appropriate crawl delays (500ms+)
- Don't scrape the same site repeatedly
- Respect robots.txt (basic checking is included)
- Avoid scraping during peak traffic hours

### Efficient Scraping
- Set max depth appropriately (3-5 is usually enough)
- Use exclude patterns to skip unnecessary pages
- Disable screenshots if not needed
- Test with small sites first

### Common Patterns to Exclude
```
/wp-admin/*, /admin/*, /login/*, /logout/*
/cart/*, /checkout/*, /account/*
/search/*, /tag/*, /category/*
*.pdf, *.zip, *.doc
```

## Troubleshooting

### Scraping is too slow
- Reduce max depth
- Increase exclude patterns
- Disable mobile screenshots
- Increase crawl delay might paradoxically help (avoid rate limiting)

### Some pages are missing
- Check if they match exclude patterns
- Verify they're actually linked from the start page
- Check if max depth is sufficient
- Some pages might require JavaScript execution

### Screenshots are blank
- Some sites block screenshot capture
- Try increasing page load wait time
- The site might use complex JavaScript rendering

### Too many files downloaded
- Use more restrictive exclude patterns
- Reduce max depth
- Some sites have many internal links

### Downloads folder is cluttered
- Each scraping session creates one main folder
- The folder name includes timestamp
- All content is organized inside that folder

## Advanced Tips

### Finding the Right Max Depth
1. Start with depth 1 to see immediate links
2. Gradually increase if you need deeper content
3. Watch the "Total Pages" counter

### Optimizing Exclude Patterns
- Test patterns on a small site first
- Use wildcard (*) strategically
- Check sitemap.json to see what was included

### Analyzing Output
- Use sitemap.json to understand site structure
- Compare desktop vs mobile screenshots
- Review metadata.json for insights
- Check color palettes and fonts for design patterns

## Privacy & Security

- All scraping happens locally in your browser
- No data is sent to external servers
- Output is saved only to your Downloads folder
- Scraped credentials or personal data should be handled responsibly

## Limitations

- JavaScript-heavy sites may not render correctly
- Some sites block automated scraping
- Very large sites (10,000+ pages) may take hours
- Screenshot quality depends on page complexity
- CORS restrictions apply to some assets
