# Installation Guide

## Prerequisites

- Google Chrome browser (version 88 or later)
- Basic understanding of Chrome extensions

## Step 1: Download the Extension

Clone or download this repository to your local machine:

```bash
git clone <repository-url>
cd Website-Scraper-Chrome-Extension
```

## Step 2: Prepare Icon Assets

Before loading the extension, you need to add icon images to the `icons/` folder. Create three PNG icons:

- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

You can create simple icons using any image editor, or use placeholder icons for testing.

**Quick tip:** You can use the same image for all three sizes (Chrome will resize them), or use online tools like [favicon.io](https://favicon.io/) to generate icons quickly.

## Step 3: Load Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked"
5. Select the `Website-Scraper-Chrome-Extension` folder
6. The extension should now appear in your extensions list

## Step 4: Pin the Extension (Optional)

For easy access:

1. Click the puzzle icon in Chrome's toolbar
2. Find "Website Scraper Pro"
3. Click the pin icon to keep it visible

## Step 5: Verify Installation

1. Click the extension icon in your toolbar
2. You should see the scraper popup interface
3. The current tab URL should auto-fill in the input field

## Troubleshooting

### Extension won't load
- Ensure all files are present in the correct folder structure
- Check that icon files exist in the `icons/` folder
- Look for errors in the Chrome extensions page

### Screenshots not working
- The extension requires the "debugger" permission
- Make sure you granted all permissions when installing
- Try reloading the extension

### Downloads not saving
- Check Chrome's download settings
- Ensure you have write permissions to your Downloads folder
- Check if any download blocking extensions are interfering

## Permissions Explained

The extension requires these permissions:

- **tabs**: To access tab information and create new tabs for scraping
- **activeTab**: To interact with the currently active tab
- **storage**: To save settings and scraping progress
- **downloads**: To save scraped content to your computer
- **scripting**: To inject content scripts for data extraction
- **debugger**: To capture full-page screenshots
- **host_permissions (all_urls)**: To scrape any website

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Website Scraper Pro"
3. Click "Remove"
4. Confirm the removal

## Updating

To update the extension:

1. Pull the latest changes from the repository
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card

Or remove and reinstall following the installation steps.
