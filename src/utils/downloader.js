// Asset downloader for managing asset downloads

export class AssetDownloader {
  constructor(organizer) {
    this.organizer = organizer;
    this.downloadedAssets = new Set();
    this.downloadQueue = [];
    this.activeDownloads = 0;
    this.maxConcurrent = 3; // Limit concurrent downloads
    this.assetCounts = {
      images: 0,
      css: 0,
      scripts: 0,
      fonts: 0
    };
  }

  // Add assets from page data
  addAssetsFromPage(pageData) {
    if (!pageData.assets) return;

    // Add images
    if (pageData.assets.images) {
      pageData.assets.images.forEach(url => {
        this.addAssetToQueue(url, 'image');
      });
    }

    // Add CSS
    if (pageData.assets.css) {
      pageData.assets.css.forEach(url => {
        this.addAssetToQueue(url, 'css');
      });
    }

    // Add scripts
    if (pageData.assets.scripts) {
      pageData.assets.scripts.forEach(url => {
        this.addAssetToQueue(url, 'script');
      });
    }

    // Add fonts
    if (pageData.assets.fonts) {
      pageData.assets.fonts.forEach(url => {
        this.addAssetToQueue(url, 'font');
      });
    }
  }

  // Add asset to download queue (with deduplication)
  addAssetToQueue(url, type) {
    // Normalize URL
    const normalizedUrl = this.normalizeAssetUrl(url);
    if (!normalizedUrl) return;

    // Skip if already downloaded or queued
    if (this.downloadedAssets.has(normalizedUrl)) {
      return;
    }

    this.downloadedAssets.add(normalizedUrl);
    this.downloadQueue.push({
      url: normalizedUrl,
      type: type
    });
  }

  // Normalize asset URL
  normalizeAssetUrl(url) {
    try {
      // Skip data URLs and other special URLs
      if (url.startsWith('data:') ||
          url.startsWith('blob:') ||
          url.startsWith('javascript:')) {
        return null;
      }

      // Remove query parameters and fragments for deduplication
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch (e) {
      return null;
    }
  }

  // Process download queue
  async processQueue() {
    while (this.downloadQueue.length > 0) {
      // Wait if too many active downloads
      while (this.activeDownloads >= this.maxConcurrent) {
        await this.sleep(100);
      }

      const asset = this.downloadQueue.shift();
      if (!asset) break;

      // Download asset (don't await - process in parallel)
      this.downloadAsset(asset.url, asset.type);
    }

    // Wait for all active downloads to complete
    while (this.activeDownloads > 0) {
      await this.sleep(100);
    }
  }

  // Download a single asset
  async downloadAsset(url, type) {
    this.activeDownloads++;

    try {
      await this.organizer.downloadAsset(url, type);

      // Update counts
      if (type === 'image') {
        this.assetCounts.images++;
      } else if (type === 'css') {
        this.assetCounts.css++;
      } else if (type === 'script') {
        this.assetCounts.scripts++;
      } else if (type === 'font') {
        this.assetCounts.fonts++;
      }
    } catch (error) {
      console.error(`Failed to download asset ${url}:`, error);
      // Continue with other downloads
    } finally {
      this.activeDownloads--;
    }
  }

  // Get asset statistics
  getStats() {
    return {
      total: this.downloadedAssets.size,
      ...this.assetCounts
    };
  }

  // Helper: Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Helper function to determine asset type from URL
export function getAssetTypeFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check file extension
    if (pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|bmp)$/)) {
      return 'image';
    } else if (pathname.match(/\.(css)$/)) {
      return 'css';
    } else if (pathname.match(/\.(js|mjs)$/)) {
      return 'script';
    } else if (pathname.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
      return 'font';
    }

    return 'other';
  } catch (e) {
    return 'other';
  }
}

// Helper function to sanitize filename
export function sanitizeFilename(filename) {
  // Remove invalid characters
  return filename.replace(/[^a-zA-Z0-9\-_.]/g, '-');
}
