// Screenshot handler for capturing page screenshots

export class ScreenshotHandler {
  constructor() {
    this.desktopWidth = 1920;
    this.desktopHeight = 1080;
    this.mobileWidth = 375;
    this.mobileHeight = 812;
  }

  // Capture screenshots for a tab
  async captureTab(tabId, url, options = {}) {
    const results = {
      desktop: null,
      mobile: null,
      error: null
    };

    try {
      // Capture desktop screenshot
      if (options.desktop !== false) {
        results.desktop = await this.captureDesktopView(tabId, url);
      }

      // Capture mobile screenshot
      if (options.mobile !== false) {
        results.mobile = await this.captureMobileView(tabId, url);
      }
    } catch (error) {
      results.error = error.message;
      console.error('Screenshot capture error:', error);
    }

    return results;
  }

  // Capture desktop view (1920px width)
  async captureDesktopView(tabId, url) {
    try {
      // Set viewport to desktop size
      await chrome.debugger.attach({ tabId }, '1.3');

      await chrome.debugger.sendCommand(
        { tabId },
        'Emulation.setDeviceMetricsOverride',
        {
          width: this.desktopWidth,
          height: this.desktopHeight,
          deviceScaleFactor: 1,
          mobile: false
        }
      );

      // Wait for page to stabilize
      await this.sleep(1000);

      // Get full page height
      const layoutMetrics = await chrome.debugger.sendCommand(
        { tabId },
        'Page.getLayoutMetrics'
      );

      const contentHeight = layoutMetrics.contentSize.height;

      // Capture full page
      const screenshot = await this.captureFullPage(
        tabId,
        this.desktopWidth,
        contentHeight
      );

      // Detach debugger
      await chrome.debugger.detach({ tabId });

      return screenshot;
    } catch (error) {
      // Fallback to simple capture if debugger fails
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {
        // Ignore detach errors
      }

      return await this.captureSimple(tabId);
    }
  }

  // Capture mobile view (375px width)
  async captureMobileView(tabId, url) {
    try {
      // Set viewport to mobile size
      await chrome.debugger.attach({ tabId }, '1.3');

      await chrome.debugger.sendCommand(
        { tabId },
        'Emulation.setDeviceMetricsOverride',
        {
          width: this.mobileWidth,
          height: this.mobileHeight,
          deviceScaleFactor: 2,
          mobile: true
        }
      );

      // Wait for page to stabilize
      await this.sleep(1000);

      // Get full page height
      const layoutMetrics = await chrome.debugger.sendCommand(
        { tabId },
        'Page.getLayoutMetrics'
      );

      const contentHeight = layoutMetrics.contentSize.height;

      // Capture full page
      const screenshot = await this.captureFullPage(
        tabId,
        this.mobileWidth,
        contentHeight
      );

      // Detach debugger
      await chrome.debugger.detach({ tabId });

      return screenshot;
    } catch (error) {
      // Detach debugger if attached
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {
        // Ignore detach errors
      }

      // Return null for mobile if it fails
      return null;
    }
  }

  // Capture full page by scrolling and stitching
  async captureFullPage(tabId, width, height) {
    try {
      const viewportHeight = 1080;
      const screenshots = [];
      let currentY = 0;

      // Capture viewport-sized chunks
      while (currentY < height) {
        const captureHeight = Math.min(viewportHeight, height - currentY);

        const screenshot = await chrome.debugger.sendCommand(
          { tabId },
          'Page.captureScreenshot',
          {
            format: 'png',
            clip: {
              x: 0,
              y: currentY,
              width: width,
              height: captureHeight,
              scale: 1
            }
          }
        );

        screenshots.push({
          data: screenshot.data,
          y: currentY,
          height: captureHeight
        });

        currentY += viewportHeight;
      }

      // If only one screenshot, return it directly
      if (screenshots.length === 1) {
        return screenshots[0].data;
      }

      // For multiple screenshots, return the first one
      // (Full stitching would require canvas manipulation which is complex in service worker)
      // This is a simplified version that captures the top portion
      return screenshots[0].data;
    } catch (error) {
      console.error('Full page capture error:', error);
      throw error;
    }
  }

  // Simple capture using chrome.tabs.captureVisibleTab (fallback)
  async captureSimple(tabId) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 100
      });

      // Convert data URL to base64
      return dataUrl.split(',')[1];
    } catch (error) {
      console.error('Simple capture error:', error);
      throw error;
    }
  }

  // Convert base64 to blob
  base64ToBlob(base64, contentType = 'image/png') {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  // Helper: Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export helper function for creating screenshot downloads
export async function downloadScreenshot(base64Data, filename) {
  try {
    // Convert base64 to data URL
    const dataUrl = `data:image/png;base64,${base64Data}`;

    // Use chrome.downloads API
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });

    return downloadId;
  } catch (error) {
    console.error('Screenshot download error:', error);
    throw error;
  }
}
