// Crawler engine for managing the scraping process

export class Crawler {
  constructor(config) {
    this.startUrl = config.url;
    this.maxDepth = config.maxDepth || 5;
    this.crawlDelay = config.crawlDelay || 500;
    this.excludePatterns = config.excludePatterns || [];

    this.baseUrl = new URL(this.startUrl).origin;
    this.visited = new Set();
    this.queue = [];
    this.siteMap = new Map();
    this.hierarchy = {};
    this.cancelled = false;
  }

  // Initialize the crawler with the starting URL
  initialize() {
    this.queue.push({
      url: this.startUrl,
      depth: 0,
      parent: null
    });

    this.siteMap.set(this.startUrl, {
      url: this.startUrl,
      depth: 0,
      parent: null,
      children: [],
      status: 'pending'
    });
  }

  // Get the next URL to crawl
  getNext() {
    return this.queue.shift();
  }

  // Check if there are more URLs to crawl
  hasNext() {
    return this.queue.length > 0 && !this.cancelled;
  }

  // Mark URL as visited
  markVisited(url) {
    this.visited.add(this.normalizeUrl(url));
    if (this.siteMap.has(url)) {
      this.siteMap.get(url).status = 'visited';
    }
  }

  // Add discovered links to the queue
  addLinks(currentUrl, links, currentDepth) {
    if (currentDepth >= this.maxDepth) {
      return;
    }

    const currentEntry = this.siteMap.get(currentUrl);

    links.forEach(link => {
      const url = link.url;
      const normalizedUrl = this.normalizeUrl(url);

      // Check if already visited or queued
      if (this.visited.has(normalizedUrl)) {
        return;
      }

      // Check if internal
      if (!this.isInternalLink(url)) {
        return;
      }

      // Check exclusion patterns
      if (this.isExcluded(url)) {
        return;
      }

      // Check if already in sitemap
      if (this.siteMap.has(url)) {
        return;
      }

      // Add to queue
      this.queue.push({
        url: url,
        depth: currentDepth + 1,
        parent: currentUrl
      });

      // Add to sitemap
      const entry = {
        url: url,
        depth: currentDepth + 1,
        parent: currentUrl,
        children: [],
        status: 'pending',
        linkText: link.text
      };

      this.siteMap.set(url, entry);

      // Add to parent's children
      if (currentEntry) {
        currentEntry.children.push(url);
      }
    });
  }

  // Check if URL matches exclusion patterns
  isExcluded(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      return this.excludePatterns.some(pattern => {
        // Simple wildcard matching
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        const regex = new RegExp(regexPattern);
        return regex.test(path) || regex.test(url);
      });
    } catch (e) {
      return true; // Exclude invalid URLs
    }
  }

  // Check if URL is internal
  isInternalLink(url) {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(this.baseUrl);
      return urlObj.hostname === baseUrlObj.hostname;
    } catch (e) {
      return false;
    }
  }

  // Normalize URL (remove fragments, trailing slashes, etc.)
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove fragment
      urlObj.hash = '';
      // Remove trailing slash (except for root)
      let pathname = urlObj.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      urlObj.pathname = pathname;
      return urlObj.href;
    } catch (e) {
      return url;
    }
  }

  // Build hierarchical structure from flat sitemap
  buildHierarchy() {
    const hierarchy = {
      url: this.startUrl,
      depth: 0,
      children: []
    };

    const buildNode = (url) => {
      const entry = this.siteMap.get(url);
      if (!entry) return null;

      const node = {
        url: entry.url,
        depth: entry.depth,
        linkText: entry.linkText || '',
        children: []
      };

      entry.children.forEach(childUrl => {
        const childNode = buildNode(childUrl);
        if (childNode) {
          node.children.push(childNode);
        }
      });

      return node;
    };

    return buildNode(this.startUrl) || hierarchy;
  }

  // Generate sitemap.json structure
  generateSitemap() {
    const hierarchy = this.buildHierarchy();

    return {
      startUrl: this.startUrl,
      baseUrl: this.baseUrl,
      totalPages: this.visited.size,
      maxDepth: this.maxDepth,
      timestamp: new Date().toISOString(),
      hierarchy: hierarchy,
      pages: Array.from(this.siteMap.values()).map(entry => ({
        url: entry.url,
        depth: entry.depth,
        parent: entry.parent,
        status: entry.status
      }))
    };
  }

  // Get folder path for a URL based on its structure
  getUrlPath(url) {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;

      // Remove leading and trailing slashes
      pathname = pathname.replace(/^\/|\/$/g, '');

      // If empty (root), return 'home'
      if (!pathname) {
        return 'home';
      }

      // Replace slashes with path separator
      return pathname.replace(/\//g, '/');
    } catch (e) {
      return 'unknown';
    }
  }

  // Get progress statistics
  getProgress() {
    return {
      total: this.siteMap.size,
      processed: this.visited.size,
      remaining: this.queue.length
    };
  }

  // Cancel the crawling process
  cancel() {
    this.cancelled = true;
    this.queue = [];
  }

  // Check if cancelled
  isCancelled() {
    return this.cancelled;
  }

  // Get all visited URLs
  getVisitedUrls() {
    return Array.from(this.visited);
  }

  // Get sitemap data
  getSiteMapData() {
    return Array.from(this.siteMap.values());
  }
}

// Helper function to create folder-safe names from URLs
export function urlToFolderName(url) {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;

    // Remove leading and trailing slashes
    pathname = pathname.replace(/^\/|\/$/g, '');

    // If empty (root), return 'home'
    if (!pathname) {
      return 'home';
    }

    // Replace invalid characters
    pathname = pathname.replace(/[^a-zA-Z0-9\-_\/]/g, '-');

    return pathname;
  } catch (e) {
    return 'unknown';
  }
}

// Helper function to create output folder name
export function createOutputFolderName(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/\./g, '-');
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/:/g, '-')
      .replace('T', '_');
    return `${domain}_${timestamp}`;
  } catch (e) {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/:/g, '-')
      .replace('T', '_');
    return `website_${timestamp}`;
  }
}
