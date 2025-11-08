// Content script for extracting page data

class PageExtractor {
  constructor() {
    this.baseUrl = window.location.origin;
    this.currentUrl = window.location.href;
  }

  // Extract all data from the current page
  extractAll() {
    return {
      url: this.currentUrl,
      metadata: this.extractMetadata(),
      navigation: this.extractNavigation(),
      links: this.extractLinks(),
      assets: this.extractAssets(),
      colorPalette: this.extractColorPalette(),
      fonts: this.extractFonts(),
      html: this.getPageHTML()
    };
  }

  // Extract page metadata
  extractMetadata() {
    const title = document.title || '';
    const metaDescription = this.getMetaContent('description') || '';
    const metaKeywords = this.getMetaContent('keywords') || '';
    const ogTitle = this.getMetaContent('og:title', 'property') || '';
    const ogDescription = this.getMetaContent('og:description', 'property') || '';
    const ogImage = this.getMetaContent('og:image', 'property') || '';

    // Get H1 tags
    const h1Tags = Array.from(document.querySelectorAll('h1'))
      .map(h1 => h1.textContent.trim())
      .filter(text => text);

    // Count words
    const bodyText = document.body.innerText || '';
    const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;

    // Count images
    const imageCount = document.querySelectorAll('img').length;

    return {
      title,
      metaDescription,
      metaKeywords,
      ogTitle,
      ogDescription,
      ogImage,
      h1Tags,
      wordCount,
      imageCount,
      url: this.currentUrl,
      timestamp: new Date().toISOString()
    };
  }

  // Extract navigation menu structure
  extractNavigation() {
    const navStructure = [];

    // Common navigation selectors
    const navSelectors = [
      'nav',
      '[role="navigation"]',
      'header nav',
      '.nav',
      '.navigation',
      '.menu',
      '#nav',
      '#navigation',
      '#menu'
    ];

    navSelectors.forEach(selector => {
      const navElements = document.querySelectorAll(selector);
      navElements.forEach(nav => {
        const links = this.extractLinksFromElement(nav);
        if (links.length > 0) {
          navStructure.push({
            selector: selector,
            links: links
          });
        }
      });
    });

    return navStructure;
  }

  // Extract all internal links
  extractLinks() {
    const links = [];
    const seen = new Set();

    document.querySelectorAll('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href) return;

      const absoluteUrl = this.makeAbsoluteUrl(href);
      if (!absoluteUrl) return;

      // Only include internal links
      if (this.isInternalLink(absoluteUrl) && !seen.has(absoluteUrl)) {
        seen.add(absoluteUrl);
        links.push({
          url: absoluteUrl,
          text: anchor.textContent.trim(),
          title: anchor.getAttribute('title') || ''
        });
      }
    });

    return links;
  }

  // Extract links from a specific element
  extractLinksFromElement(element) {
    const links = [];
    const anchors = element.querySelectorAll('a[href]');

    anchors.forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href) return;

      const absoluteUrl = this.makeAbsoluteUrl(href);
      if (absoluteUrl) {
        links.push({
          url: absoluteUrl,
          text: anchor.textContent.trim(),
          title: anchor.getAttribute('title') || ''
        });
      }
    });

    return links;
  }

  // Extract all asset URLs
  extractAssets() {
    const assets = {
      images: this.extractImageUrls(),
      css: this.extractCssUrls(),
      scripts: this.extractScriptUrls(),
      fonts: this.extractFontUrls()
    };

    return assets;
  }

  // Extract image URLs
  extractImageUrls() {
    const images = new Set();

    // Regular img tags
    document.querySelectorAll('img[src]').forEach(img => {
      const src = this.makeAbsoluteUrl(img.getAttribute('src'));
      if (src) images.add(src);

      // Srcset
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(src => {
          const url = src.trim().split(/\s+/)[0];
          const absoluteUrl = this.makeAbsoluteUrl(url);
          if (absoluteUrl) images.add(absoluteUrl);
        });
      }
    });

    // Background images from inline styles
    document.querySelectorAll('[style*="background"]').forEach(el => {
      const style = el.getAttribute('style');
      const urlMatch = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
      if (urlMatch) {
        const url = this.makeAbsoluteUrl(urlMatch[1]);
        if (url) images.add(url);
      }
    });

    // SVG images
    document.querySelectorAll('svg image[href], svg image[xlink\\:href]').forEach(img => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href');
      const url = this.makeAbsoluteUrl(href);
      if (url) images.add(url);
    });

    return Array.from(images);
  }

  // Extract CSS URLs
  extractCssUrls() {
    const cssUrls = new Set();

    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = this.makeAbsoluteUrl(link.getAttribute('href'));
      if (href) cssUrls.add(href);
    });

    // Inline style tags (we might want to save these too)
    document.querySelectorAll('style').forEach(style => {
      const content = style.textContent;
      // Extract URLs from CSS content
      const urlMatches = content.matchAll(/url\(['"]?([^'"()]+)['"]?\)/g);
      for (const match of urlMatches) {
        const url = this.makeAbsoluteUrl(match[1]);
        if (url) cssUrls.add(url);
      }
    });

    return Array.from(cssUrls);
  }

  // Extract script URLs
  extractScriptUrls() {
    const scriptUrls = new Set();

    document.querySelectorAll('script[src]').forEach(script => {
      const src = this.makeAbsoluteUrl(script.getAttribute('src'));
      if (src) scriptUrls.add(src);
    });

    return Array.from(scriptUrls);
  }

  // Extract font URLs
  extractFontUrls() {
    const fontUrls = new Set();

    // Check stylesheets for @font-face rules
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule instanceof CSSFontFaceRule) {
              const src = rule.style.getPropertyValue('src');
              const urlMatches = src.matchAll(/url\(['"]?([^'"()]+)['"]?\)/g);
              for (const match of urlMatches) {
                const url = this.makeAbsoluteUrl(match[1]);
                if (url) fontUrls.add(url);
              }
            }
          });
        } catch (e) {
          // CORS error, skip this stylesheet
        }
      });
    } catch (e) {
      console.warn('Error extracting font URLs:', e);
    }

    return Array.from(fontUrls);
  }

  // Extract color palette from computed styles
  extractColorPalette() {
    const colors = new Set();
    const elements = document.querySelectorAll('*');
    const maxElements = Math.min(elements.length, 100); // Sample first 100 elements

    for (let i = 0; i < maxElements; i++) {
      const el = elements[i];
      const style = window.getComputedStyle(el);

      // Get colors
      const color = style.color;
      const bgColor = style.backgroundColor;
      const borderColor = style.borderColor;

      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        colors.add(this.rgbToHex(color));
      }
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        colors.add(this.rgbToHex(bgColor));
      }
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
        colors.add(this.rgbToHex(borderColor));
      }
    }

    return Array.from(colors).slice(0, 20); // Return top 20 colors
  }

  // Extract fonts used on the page
  extractFonts() {
    const fonts = new Set();
    const elements = document.querySelectorAll('*');
    const maxElements = Math.min(elements.length, 100); // Sample first 100 elements

    for (let i = 0; i < maxElements; i++) {
      const el = elements[i];
      const style = window.getComputedStyle(el);
      const fontFamily = style.fontFamily;

      if (fontFamily) {
        // Clean up font family string
        const cleanFonts = fontFamily
          .split(',')
          .map(f => f.trim().replace(/['"]/g, ''))
          .filter(f => f && f !== 'serif' && f !== 'sans-serif' && f !== 'monospace');

        cleanFonts.forEach(font => fonts.add(font));
      }
    }

    return Array.from(fonts);
  }

  // Get page HTML
  getPageHTML() {
    return document.documentElement.outerHTML;
  }

  // Helper: Get meta tag content
  getMetaContent(name, attribute = 'name') {
    const meta = document.querySelector(`meta[${attribute}="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  // Helper: Make URL absolute
  makeAbsoluteUrl(url) {
    if (!url) return null;

    try {
      // Remove any leading/trailing whitespace
      url = url.trim();

      // Skip data URLs, mailto, tel, javascript, etc.
      if (url.startsWith('data:') ||
          url.startsWith('mailto:') ||
          url.startsWith('tel:') ||
          url.startsWith('javascript:') ||
          url.startsWith('#')) {
        return null;
      }

      // Make absolute
      const absoluteUrl = new URL(url, this.currentUrl);
      return absoluteUrl.href;
    } catch (e) {
      return null;
    }
  }

  // Helper: Check if URL is internal
  isInternalLink(url) {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(this.baseUrl);
      return urlObj.hostname === baseUrlObj.hostname;
    } catch (e) {
      return false;
    }
  }

  // Helper: Convert RGB to Hex
  rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;

    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return rgb;

    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);

    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractPageData') {
    try {
      const extractor = new PageExtractor();
      const data = extractor.extractAll();
      sendResponse({ success: true, data: data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep channel open for async response
  }

  if (message.action === 'getLinks') {
    try {
      const extractor = new PageExtractor();
      const links = extractor.extractLinks();
      sendResponse({ success: true, links: links });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});
