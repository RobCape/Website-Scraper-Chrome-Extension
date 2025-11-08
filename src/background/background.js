// Background service worker - Main coordinator for the scraping process

import { Crawler } from '../utils/crawler.js';
import { ScreenshotHandler } from '../utils/screenshot.js';
import { FileOrganizer } from '../utils/organizer.js';
import { AssetDownloader } from '../utils/downloader.js';

class ScraperService {
  constructor() {
    this.crawler = null;
    this.screenshotHandler = new ScreenshotHandler();
    this.organizer = null;
    this.downloader = null;
    this.scrapingTab = null;
    this.isRunning = false;
    this.config = null;
    this.progress = {
      processed: 0,
      total: 0,
      currentUrl: null
    };
  }

  // Start the scraping process
  async startScraping(config) {
    if (this.isRunning) {
      throw new Error('Scraping is already in progress');
    }

    this.isRunning = true;
    this.config = config;

    try {
      // Initialize components
      this.crawler = new Crawler(config);
      this.organizer = new FileOrganizer(config.url);
      this.downloader = new AssetDownloader(this.organizer);

      // Initialize crawler
      this.crawler.initialize();

      // Create a new tab for scraping
      this.scrapingTab = await chrome.tabs.create({
        url: config.url,
        active: false
      });

      // Send status message
      this.sendStatusMessage('Scraping initialized...');

      // Start the crawling process
      await this.crawlPages();

      // Download assets
      this.sendStatusMessage('Downloading assets...');
      await this.downloader.processQueue();

      // Generate and download sitemap
      this.sendStatusMessage('Generating sitemap...');
      const sitemap = this.crawler.generateSitemap();
      await this.organizer.downloadSitemap(sitemap);

      // Generate and download metadata
      this.sendStatusMessage('Generating metadata...');
      const assetStats = this.downloader.getStats();
      const metadata = this.organizer.generateSummaryMetadata(
        this.crawler,
        this.progress.processed * 2, // desktop + mobile
        assetStats.total
      );
      await this.organizer.downloadMetadata(metadata);

      // Wait for all downloads to complete
      this.sendStatusMessage('Finalizing downloads...');
      await this.sleep(2000); // Give time for downloads to finish

      // Close the scraping tab
      if (this.scrapingTab) {
        await chrome.tabs.remove(this.scrapingTab.id);
      }

      // Send completion message
      this.sendCompleteMessage({
        totalPages: this.crawler.visited.size,
        screenshots: this.progress.processed * 2,
        assets: assetStats.total,
        folderName: this.organizer.getOutputFolderName()
      });

      // Save state
      await this.saveState('completed');
    } catch (error) {
      console.error('Scraping error:', error);
      this.sendErrorMessage(error.message);
      await this.cleanup();
    } finally {
      this.isRunning = false;
    }
  }

  // Crawl all pages in the queue
  async crawlPages() {
    while (this.crawler.hasNext()) {
      // Check if cancelled
      if (this.crawler.isCancelled()) {
        this.sendStatusMessage('Scraping cancelled');
        break;
      }

      const item = this.crawler.getNext();
      if (!item) break;

      try {
        await this.scrapePage(item.url, item.depth);
      } catch (error) {
        console.error(`Error scraping ${item.url}:`, error);
        this.sendStatusMessage(`Error scraping ${item.url}: ${error.message}`);
      }

      // Update progress
      this.progress.processed = this.crawler.visited.size;
      this.progress.total = this.crawler.siteMap.size;
      this.progress.currentUrl = item.url;

      this.sendProgressUpdate();

      // Apply crawl delay
      if (this.config.crawlDelay > 0) {
        await this.sleep(this.config.crawlDelay);
      }
    }
  }

  // Scrape a single page
  async scrapePage(url, depth) {
    this.sendStatusMessage(`Scraping: ${url}`);

    try {
      // Navigate to the page
      await chrome.tabs.update(this.scrapingTab.id, { url: url });

      // Wait for page to load
      await this.waitForPageLoad(this.scrapingTab.id);

      // Extract page data
      const pageData = await this.extractPageData(this.scrapingTab.id);

      if (!pageData) {
        throw new Error('Failed to extract page data');
      }

      // Mark as visited
      this.crawler.markVisited(url);

      // Store page data
      this.organizer.savePageData(url, pageData);

      // Add discovered links to crawler
      if (pageData.links) {
        this.crawler.addLinks(url, pageData.links, depth);
      }

      // Capture screenshots
      if (this.config.screenshotDesktop || this.config.screenshotMobile) {
        await this.captureScreenshots(url);
      }

      // Download page HTML
      if (pageData.html) {
        await this.organizer.downloadPageHtml(url, pageData.html);
      }

      // Download page metadata
      if (pageData.metadata) {
        await this.organizer.downloadPageMetadata(url, pageData.metadata);
      }

      // Add assets to download queue
      this.downloader.addAssetsFromPage(pageData);

    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      throw error;
    }
  }

  // Extract page data using content script
  async extractPageData(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'extractPageData'
      });

      if (response && response.success) {
        return response.data;
      } else {
        throw new Error(response?.error || 'Failed to extract page data');
      }
    } catch (error) {
      console.error('Extract page data error:', error);
      return null;
    }
  }

  // Capture screenshots for the current page
  async captureScreenshots(url) {
    try {
      const screenshots = await this.screenshotHandler.captureTab(
        this.scrapingTab.id,
        url,
        {
          desktop: this.config.screenshotDesktop,
          mobile: this.config.screenshotMobile
        }
      );

      // Download screenshots
      if (screenshots.desktop) {
        await this.organizer.downloadScreenshot(url, screenshots.desktop, 'desktop');
      }

      if (screenshots.mobile) {
        await this.organizer.downloadScreenshot(url, screenshots.mobile, 'mobile');
      }
    } catch (error) {
      console.error('Screenshot capture error:', error);
      // Don't fail the whole scrape if screenshots fail
      this.sendStatusMessage(`Warning: Screenshot capture failed for ${url}`);
    }
  }

  // Wait for page to load
  async waitForPageLoad(tabId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Page load timeout'));
      }, timeout);

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeoutId);
          chrome.tabs.onUpdated.removeListener(listener);
          // Give extra time for JS to execute
          setTimeout(() => resolve(), 1000);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  // Cancel scraping
  async cancelScraping() {
    if (!this.isRunning) {
      return;
    }

    if (this.crawler) {
      this.crawler.cancel();
    }

    this.sendStatusMessage('Cancelling scraping...');
    await this.cleanup();

    this.sendMessage({ type: 'cancelled' });
  }

  // Cleanup resources
  async cleanup() {
    if (this.scrapingTab) {
      try {
        await chrome.tabs.remove(this.scrapingTab.id);
      } catch (e) {
        // Tab might already be closed
      }
      this.scrapingTab = null;
    }

    this.isRunning = false;
    await this.saveState('idle');
  }

  // Send progress update to popup
  sendProgressUpdate() {
    this.sendMessage({
      type: 'progress',
      data: {
        processed: this.progress.processed,
        total: this.progress.total,
        currentUrl: this.progress.currentUrl
      }
    });
  }

  // Send status message to popup
  sendStatusMessage(message) {
    this.sendMessage({
      type: 'status',
      data: { message }
    });
  }

  // Send completion message
  sendCompleteMessage(data) {
    this.sendMessage({
      type: 'complete',
      data: data
    });
  }

  // Send error message
  sendErrorMessage(error) {
    this.sendMessage({
      type: 'error',
      data: { error }
    });
  }

  // Send message to popup
  sendMessage(message) {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might be closed, ignore error
    });
  }

  // Get current status
  getStatus() {
    return {
      status: this.isRunning ? 'running' : 'idle',
      progress: this.isRunning ? this.progress : null
    };
  }

  // Save state to storage
  async saveState(status) {
    await chrome.storage.local.set({
      scraperState: {
        status: status,
        progress: this.progress,
        timestamp: Date.now()
      }
    });
  }

  // Helper: Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create service instance
const scraperService = new ScraperService();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'startScraping':
          await scraperService.startScraping(message.config);
          sendResponse({ success: true });
          break;

        case 'cancelScraping':
          await scraperService.cancelScraping();
          sendResponse({ success: true });
          break;

        case 'getStatus':
          const status = scraperService.getStatus();
          sendResponse(status);
          break;

        case 'openFolder':
          // Note: Can't directly open folders from extension
          // User will need to navigate to downloads folder manually
          sendResponse({ success: true, message: 'Check your Downloads folder' });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Website Scraper Pro installed');
});

// Handle tab closure (cleanup if scraping tab is closed)
chrome.tabs.onRemoved.addListener((tabId) => {
  if (scraperService.scrapingTab && scraperService.scrapingTab.id === tabId) {
    scraperService.cancelScraping();
  }
});
