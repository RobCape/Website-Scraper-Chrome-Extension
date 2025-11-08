// File organizer for creating output structure

import { urlToFolderName, createOutputFolderName } from './crawler.js';

export class FileOrganizer {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.outputFolderName = createOutputFolderName(baseUrl);
    this.downloads = [];
    this.pageData = new Map();
  }

  // Get output folder name
  getOutputFolderName() {
    return this.outputFolderName;
  }

  // Get folder path for a URL
  getPageFolderPath(url) {
    const folderName = urlToFolderName(url);
    return `${this.outputFolderName}/${folderName}`;
  }

  // Save page data
  savePageData(url, data) {
    this.pageData.set(url, data);
  }

  // Download page HTML
  async downloadPageHtml(url, html) {
    const folderPath = this.getPageFolderPath(url);
    const filename = `${folderPath}/index.html`;

    try {
      const blob = new Blob([html], { type: 'text/html' });
      const dataUrl = await this.blobToDataUrl(blob);

      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      this.downloads.push({
        id: downloadId,
        type: 'html',
        url: url,
        filename: filename
      });

      return downloadId;
    } catch (error) {
      console.error('Error downloading HTML:', error);
      throw error;
    }
  }

  // Download page metadata
  async downloadPageMetadata(url, metadata) {
    const folderPath = this.getPageFolderPath(url);
    const filename = `${folderPath}/page-metadata.json`;

    try {
      const json = JSON.stringify(metadata, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const dataUrl = await this.blobToDataUrl(blob);

      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      this.downloads.push({
        id: downloadId,
        type: 'metadata',
        url: url,
        filename: filename
      });

      return downloadId;
    } catch (error) {
      console.error('Error downloading metadata:', error);
      throw error;
    }
  }

  // Download screenshot
  async downloadScreenshot(url, base64Data, type) {
    const folderPath = this.getPageFolderPath(url);
    const filename = `${folderPath}/screenshot-${type}.png`;

    try {
      const dataUrl = `data:image/png;base64,${base64Data}`;

      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      this.downloads.push({
        id: downloadId,
        type: `screenshot-${type}`,
        url: url,
        filename: filename
      });

      return downloadId;
    } catch (error) {
      console.error('Error downloading screenshot:', error);
      throw error;
    }
  }

  // Download asset
  async downloadAsset(assetUrl, assetType) {
    try {
      // Create asset folder path
      const urlObj = new URL(assetUrl);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'asset';

      // Determine subfolder based on asset type
      let subfolder = 'other';
      if (assetType === 'image') {
        subfolder = 'images';
      } else if (assetType === 'css') {
        subfolder = 'css';
      } else if (assetType === 'script') {
        subfolder = 'js';
      } else if (assetType === 'font') {
        subfolder = 'fonts';
      }

      const assetPath = `${this.outputFolderName}/assets/${subfolder}/${filename}`;

      // Download the asset
      const downloadId = await chrome.downloads.download({
        url: assetUrl,
        filename: assetPath,
        saveAs: false
      });

      this.downloads.push({
        id: downloadId,
        type: assetType,
        url: assetUrl,
        filename: assetPath
      });

      return downloadId;
    } catch (error) {
      console.error('Error downloading asset:', error);
      // Don't throw, just log - assets might fail due to CORS
      return null;
    }
  }

  // Generate and download sitemap.json
  async downloadSitemap(sitemapData) {
    const filename = `${this.outputFolderName}/sitemap.json`;

    try {
      const json = JSON.stringify(sitemapData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const dataUrl = await this.blobToDataUrl(blob);

      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      this.downloads.push({
        id: downloadId,
        type: 'sitemap',
        filename: filename
      });

      return downloadId;
    } catch (error) {
      console.error('Error downloading sitemap:', error);
      throw error;
    }
  }

  // Generate and download metadata.json (scrape summary)
  async downloadMetadata(metadata) {
    const filename = `${this.outputFolderName}/metadata.json`;

    try {
      const json = JSON.stringify(metadata, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const dataUrl = await this.blobToDataUrl(blob);

      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      this.downloads.push({
        id: downloadId,
        type: 'metadata',
        filename: filename
      });

      return downloadId;
    } catch (error) {
      console.error('Error downloading metadata:', error);
      throw error;
    }
  }

  // Generate scrape summary metadata
  generateSummaryMetadata(crawler, totalScreenshots, totalAssets) {
    return {
      scrapedAt: new Date().toISOString(),
      startUrl: crawler.startUrl,
      baseUrl: crawler.baseUrl,
      totalPages: crawler.visited.size,
      maxDepth: crawler.maxDepth,
      totalScreenshots: totalScreenshots,
      totalAssets: totalAssets,
      outputFolder: this.outputFolderName,
      pages: Array.from(this.pageData.entries()).map(([url, data]) => ({
        url: url,
        title: data.metadata?.title || '',
        depth: crawler.siteMap.get(url)?.depth || 0
      }))
    };
  }

  // Helper: Convert blob to data URL
  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Get download statistics
  getDownloadStats() {
    return {
      total: this.downloads.length,
      byType: this.downloads.reduce((acc, download) => {
        acc[download.type] = (acc[download.type] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // Wait for all downloads to complete
  async waitForDownloads() {
    const downloadIds = this.downloads.map(d => d.id).filter(id => id);

    if (downloadIds.length === 0) {
      return;
    }

    return new Promise((resolve) => {
      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed >= downloadIds.length) {
          resolve();
        }
      };

      // Listen for download completion
      const listener = (delta) => {
        if (delta.state && delta.state.current === 'complete') {
          if (downloadIds.includes(delta.id)) {
            checkComplete();
          }
        }
      };

      chrome.downloads.onChanged.addListener(listener);

      // Query current state of downloads
      downloadIds.forEach(id => {
        chrome.downloads.search({ id }, (results) => {
          if (results.length > 0 && results[0].state === 'complete') {
            checkComplete();
          }
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        chrome.downloads.onChanged.removeListener(listener);
        resolve();
      }, 30000);
    });
  }
}
