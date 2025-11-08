// Popup UI controller for Website Scraper Pro

class PopupController {
  constructor() {
    this.elements = this.getElements();
    this.state = {
      isScraperRunning: false,
      currentConfig: null
    };
    this.init();
  }

  getElements() {
    return {
      urlInput: document.getElementById('urlInput'),
      autoFillBtn: document.getElementById('autoFillBtn'),
      maxDepth: document.getElementById('maxDepth'),
      crawlDelay: document.getElementById('crawlDelay'),
      screenshotDesktop: document.getElementById('screenshotDesktop'),
      screenshotMobile: document.getElementById('screenshotMobile'),
      excludePatterns: document.getElementById('excludePatterns'),
      startBtn: document.getElementById('startBtn'),
      cancelBtn: document.getElementById('cancelBtn'),
      settingsToggle: document.getElementById('settingsToggle'),
      settingsContent: document.getElementById('settingsContent'),
      progressSection: document.getElementById('progressSection'),
      resultsSection: document.getElementById('resultsSection'),
      errorSection: document.getElementById('errorSection'),
      progressFill: document.getElementById('progressFill'),
      progressPercent: document.getElementById('progressPercent'),
      pagesProcessed: document.getElementById('pagesProcessed'),
      totalPages: document.getElementById('totalPages'),
      currentPage: document.getElementById('currentPage'),
      statusMessages: document.getElementById('statusMessages'),
      openFolderBtn: document.getElementById('openFolderBtn'),
      resultsSummary: document.getElementById('resultsSummary'),
      errorMessage: document.getElementById('errorMessage')
    };
  }

  init() {
    this.attachEventListeners();
    this.loadSettings();
    this.autoFillCurrentTab();
    this.checkScraperStatus();
  }

  attachEventListeners() {
    // Auto-fill button
    this.elements.autoFillBtn.addEventListener('click', () => {
      this.autoFillCurrentTab();
    });

    // Settings toggle
    this.elements.settingsToggle.addEventListener('click', () => {
      this.toggleSettings();
    });

    // Start button
    this.elements.startBtn.addEventListener('click', () => {
      this.startScraping();
    });

    // Cancel button
    this.elements.cancelBtn.addEventListener('click', () => {
      this.cancelScraping();
    });

    // Open folder button
    this.elements.openFolderBtn.addEventListener('click', () => {
      this.openOutputFolder();
    });

    // Save settings on change
    [this.elements.maxDepth, this.elements.crawlDelay,
     this.elements.screenshotDesktop, this.elements.screenshotMobile,
     this.elements.excludePatterns].forEach(element => {
      element.addEventListener('change', () => {
        this.saveSettings();
      });
    });

    // Listen for progress updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message);
    });
  }

  async autoFillCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        this.elements.urlInput.value = tab.url;
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
    }
  }

  toggleSettings() {
    this.elements.settingsContent.classList.toggle('hidden');
    this.elements.settingsToggle.classList.toggle('collapsed');
  }

  loadSettings() {
    chrome.storage.local.get(['scraperSettings'], (result) => {
      if (result.scraperSettings) {
        const settings = result.scraperSettings;
        this.elements.maxDepth.value = settings.maxDepth || 5;
        this.elements.crawlDelay.value = settings.crawlDelay || 500;
        this.elements.screenshotDesktop.checked = settings.screenshotDesktop !== false;
        this.elements.screenshotMobile.checked = settings.screenshotMobile !== false;
        this.elements.excludePatterns.value = settings.excludePatterns || '';
      }
    });
  }

  saveSettings() {
    const settings = {
      maxDepth: parseInt(this.elements.maxDepth.value),
      crawlDelay: parseInt(this.elements.crawlDelay.value),
      screenshotDesktop: this.elements.screenshotDesktop.checked,
      screenshotMobile: this.elements.screenshotMobile.checked,
      excludePatterns: this.elements.excludePatterns.value
    };
    chrome.storage.local.set({ scraperSettings: settings });
  }

  async startScraping() {
    const url = this.elements.urlInput.value.trim();

    // Validate URL
    if (!url) {
      this.showError('Please enter a URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      this.showError('Please enter a valid URL');
      return;
    }

    // Hide error and results sections
    this.elements.errorSection.style.display = 'none';
    this.elements.resultsSection.style.display = 'none';

    // Get settings
    const config = {
      url: url,
      maxDepth: parseInt(this.elements.maxDepth.value),
      crawlDelay: parseInt(this.elements.crawlDelay.value),
      screenshotDesktop: this.elements.screenshotDesktop.checked,
      screenshotMobile: this.elements.screenshotMobile.checked,
      excludePatterns: this.elements.excludePatterns.value
        .split(',')
        .map(p => p.trim())
        .filter(p => p)
    };

    this.state.currentConfig = config;
    this.state.isScraperRunning = true;

    // Update UI
    this.elements.startBtn.disabled = true;
    this.elements.cancelBtn.style.display = 'block';
    this.elements.progressSection.style.display = 'block';

    // Reset progress
    this.updateProgress(0, 0, 0);
    this.elements.statusMessages.innerHTML = '';

    // Send message to background script to start scraping
    chrome.runtime.sendMessage({
      action: 'startScraping',
      config: config
    }, (response) => {
      if (response && response.error) {
        this.showError(response.error);
        this.resetUI();
      }
    });

    this.addStatusMessage('Scraping started...');
  }

  async cancelScraping() {
    chrome.runtime.sendMessage({ action: 'cancelScraping' });
    this.addStatusMessage('Cancelling scraping...');
    this.elements.cancelBtn.disabled = true;
  }

  async checkScraperStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response && response.status === 'running') {
        this.state.isScraperRunning = true;
        this.elements.startBtn.disabled = true;
        this.elements.cancelBtn.style.display = 'block';
        this.elements.progressSection.style.display = 'block';

        if (response.progress) {
          this.updateProgress(
            response.progress.processed,
            response.progress.total,
            response.progress.currentUrl
          );
        }
      }
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'progress':
        this.updateProgress(
          message.data.processed,
          message.data.total,
          message.data.currentUrl
        );
        break;

      case 'status':
        this.addStatusMessage(message.data.message);
        break;

      case 'complete':
        this.handleComplete(message.data);
        break;

      case 'error':
        this.showError(message.data.error);
        this.resetUI();
        break;

      case 'cancelled':
        this.addStatusMessage('Scraping cancelled');
        this.resetUI();
        break;
    }
  }

  updateProgress(processed, total, currentUrl) {
    this.elements.pagesProcessed.textContent = processed;
    this.elements.totalPages.textContent = total;

    if (currentUrl) {
      const urlObj = new URL(currentUrl);
      this.elements.currentPage.textContent = urlObj.pathname || '/';
    }

    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    this.elements.progressPercent.textContent = `${percent}%`;
    this.elements.progressFill.style.width = `${percent}%`;
  }

  addStatusMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    const messageElement = document.createElement('div');
    messageElement.className = 'status-message';
    messageElement.innerHTML = `<span class="timestamp">[${timestamp}]</span>${message}`;
    this.elements.statusMessages.appendChild(messageElement);
    this.elements.statusMessages.scrollTop = this.elements.statusMessages.scrollHeight;
  }

  handleComplete(data) {
    this.state.isScraperRunning = false;
    this.elements.startBtn.disabled = false;
    this.elements.cancelBtn.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';

    // Show results summary
    const summary = `
      <p><strong>Total Pages:</strong> ${data.totalPages || 0}</p>
      <p><strong>Screenshots:</strong> ${data.screenshots || 0}</p>
      <p><strong>Assets Downloaded:</strong> ${data.assets || 0}</p>
      <p><strong>Output Folder:</strong> ${data.folderName || 'N/A'}</p>
    `;
    this.elements.resultsSummary.innerHTML = summary;

    // Store output folder for opening
    chrome.storage.local.set({ lastOutputFolder: data.folderPath });

    this.addStatusMessage('Scraping completed successfully!');
  }

  showError(errorMessage) {
    this.elements.errorSection.style.display = 'block';
    this.elements.errorMessage.textContent = errorMessage;
    this.addStatusMessage(`Error: ${errorMessage}`);
  }

  resetUI() {
    this.state.isScraperRunning = false;
    this.elements.startBtn.disabled = false;
    this.elements.cancelBtn.style.display = 'none';
    this.elements.cancelBtn.disabled = false;
  }

  async openOutputFolder() {
    const result = await chrome.storage.local.get(['lastOutputFolder']);
    if (result.lastOutputFolder) {
      chrome.runtime.sendMessage({
        action: 'openFolder',
        path: result.lastOutputFolder
      });
    }
  }
}

// Initialize popup controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
