/* global JSONEditor */

class TestRunnerUI {
    constructor() {
        this.isServerRunning = false;
        this.isAppiumRunning = false;
        this.isEmulatorRunning = false;
        this.activeLogTab = 'local-runner';
        this.appiumTabsVisible = false;
        this.selectedConfigFile = null;
        this.configFileContent = null;
        this.jsonEditor = null; // JSON editor instance
        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.updateServerStatus();
        this.updateAppiumStatus();
        this.loadLibVersion();
        this.initializeConfigPanel();
    }

    bindElements() {
        // Server controls
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.clearLogsBtn = document.getElementById('clear-logs-btn');

        // Local Runner status elements
        this.localRunnerStatusText = document.getElementById('local-runner-status-text');
        this.localRunnerStatusDot = document.getElementById('local-runner-status-dot');

        // Log containers
        this.localRunnerLogs = document.getElementById('local-runner-logs');
        this.appiumLogs = document.getElementById('appium-logs');
        this.adbLogs = document.getElementById('adb-logs');

        // Log tabs
        this.logTabs = document.querySelectorAll('.log-tab');

        // Appium controls
        this.startAppiumBtn = document.getElementById('start-appium-btn');
        this.stopAppiumBtn = document.getElementById('stop-appium-btn');
        this.deviceAvdInput = document.getElementById('device-avd');
        this.appiumStatusText = document.getElementById('appium-status-text');
        this.appiumStatusDot = document.getElementById('appium-status-dot');
        this.emulatorStatusText = document.getElementById('emulator-status-text');
        this.emulatorStatusDot = document.getElementById('emulator-status-dot');

        // Version element
        this.libVersionElement = document.getElementById('lib-version');

        // Configuration panel elements
        this.configFileInput = document.getElementById('config-file-input');
        this.selectConfigBtn = document.getElementById('select-config-btn');
        this.selectedFileInfo = document.getElementById('selected-file-info');
        this.selectedFileName = document.getElementById('selected-file-name');
        this.selectedFilePath = document.getElementById('selected-file-path');
        this.sendConfigBtn = document.getElementById('send-config-btn');
        this.viewConfigBtn = document.getElementById('view-config-btn');
        this.configViewer = document.getElementById('config-viewer');
    }

    bindEvents() {
        // Server events
        this.startBtn.addEventListener('click', () => this.startServer());
        this.stopBtn.addEventListener('click', () => this.stopServer());
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());

        // Log tab events
        this.logTabs.forEach((tab) => {
            tab.addEventListener('click', () => this.switchLogTab(tab.dataset.tab));
        });

        // Appium events
        this.startAppiumBtn.addEventListener('click', () => this.startAppium());
        this.stopAppiumBtn.addEventListener('click', () => this.stopAppium());

        // Configuration panel events
        this.selectConfigBtn.addEventListener('click', () => this.selectConfigFile());
        this.configFileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        this.sendConfigBtn.addEventListener('click', () => this.sendConfigToRunner());
        this.viewConfigBtn.addEventListener('click', () => this.viewConfiguration());

        // Listen for server events
        window.electronAPI.onServerLog((data) => {
            this.addLogEntry('local-runner', data.type, data.message);
        });

        window.electronAPI.onServerStatus((data) => {
            this.isServerRunning = data.running;
            this.updateUI();
        });

        // Listen for test results
        if (window.electronAPI.onTestResults) {
            window.electronAPI.onTestResults((results) => {
                this.displayTestResults(results);
            });
        }

        // Listen for Appium events
        window.electronAPI.onAppiumStatus((data) => {
            this.isAppiumRunning = data.appiumRunning;
            this.isEmulatorRunning = data.emulatorRunning;
            this.updateAppiumUI();
        });

        // Listen for Appium logs
        window.electronAPI.onAppiumLog &&
            window.electronAPI.onAppiumLog((data) => {
                this.addLogEntry('appium', data.type, data.message);
            });

        // Listen for ADB logs
        window.electronAPI.onAdbLog &&
            window.electronAPI.onAdbLog((data) => {
                this.addLogEntry('adb', data.type, data.message);
            });
    }

    async startServer() {
        this.startBtn.disabled = true;
        this.startBtn.innerHTML = '<span class="btn-icon">⏳</span>Starting...';

        try {
            const result = await window.electronAPI.startServer();

            if (result.success) {
                this.isServerRunning = true;
                this.addLogEntry('local-runner', 'info', result.message);
            } else {
                this.addLogEntry('local-runner', 'error', result.message);
            }
        } catch (error) {
            this.addLogEntry('local-runner', 'error', `Failed to start local runner: ${error.message}`);
        } finally {
            this.updateUI();
        }
    }

    async stopServer() {
        this.stopBtn.disabled = true;
        this.stopBtn.innerHTML = '<span class="btn-icon">⏳</span>Stopping...';

        try {
            const result = await window.electronAPI.stopServer();

            if (result.success) {
                this.isServerRunning = false;
                this.addLogEntry('local-runner', 'info', result.message);
            } else {
                this.addLogEntry('local-runner', 'error', result.message);
            }
        } catch (error) {
            this.addLogEntry('local-runner', 'error', `Failed to stop local runner: ${error.message}`);
        } finally {
            this.updateUI();
        }
    }

    async updateServerStatus() {
        try {
            const status = await window.electronAPI.getServerStatus();
            this.isServerRunning = status.running;
            this.updateUI();
        } catch (error) {
            console.error('Failed to get server status:', error);
        }
    }

    async updateAppiumStatus() {
        try {
            const status = await window.electronAPI.getAppiumStatus();
            this.isAppiumRunning = status.appiumRunning;
            this.isEmulatorRunning = status.emulatorRunning;
            this.updateAppiumUI();
        } catch (error) {
            console.error('Failed to get Appium status:', error);
        }
    }

    async startAppium() {
        const deviceAvd = this.deviceAvdInput.value.trim();
        if (!deviceAvd) {
            this.addLogEntry('local-runner', 'error', 'Please enter a Device AVD ID');
            return;
        }

        // Show Appium and ADB tabs when starting Appium
        this.showAppiumTabs();

        this.startAppiumBtn.disabled = true;
        this.startAppiumBtn.innerHTML = '<span class="btn-icon">⏳</span>Starting...';

        try {
            const result = await window.electronAPI.startAppium(deviceAvd);

            if (result.success) {
                this.addLogEntry('local-runner', 'info', result.message);
            } else {
                this.addLogEntry('local-runner', 'error', result.message);
            }
        } catch (error) {
            this.addLogEntry('local-runner', 'error', `Failed to start Appium: ${error.message}`);
        } finally {
            this.updateAppiumUI();
        }
    }

    async stopAppium() {
        this.stopAppiumBtn.disabled = true;
        this.stopAppiumBtn.innerHTML = '<span class="btn-icon">⏳</span>Stopping...';

        try {
            const result = await window.electronAPI.stopAppium();

            if (result.success) {
                this.addLogEntry('local-runner', 'info', result.message);
            } else {
                this.addLogEntry('local-runner', 'error', result.message);
            }
        } catch (error) {
            this.addLogEntry('local-runner', 'error', `Failed to stop Appium: ${error.message}`);
        } finally {
            this.updateAppiumUI();
        }
    }

    updateUI() {
        if (this.isServerRunning) {
            // Panel status
            this.localRunnerStatusText.textContent = 'Running';
            this.localRunnerStatusDot.className = 'status-dot running';

            // Buttons
            this.startBtn.disabled = true;
            this.startBtn.innerHTML = '<span class="btn-icon">▶</span>Start';
            this.stopBtn.disabled = false;
            this.stopBtn.innerHTML = '<span class="btn-icon">⏹</span>Stop';
        } else {
            // Panel status
            this.localRunnerStatusText.textContent = 'Stopped';
            this.localRunnerStatusDot.className = 'status-dot stopped';

            // Buttons
            this.startBtn.disabled = false;
            this.startBtn.innerHTML = '<span class="btn-icon">▶</span>Start';
            this.stopBtn.disabled = true;
            this.stopBtn.innerHTML = '<span class="btn-icon">⏹</span>Stop';
        }

        // Update config send button state
        this.updateConfigUI();
    }

    updateAppiumUI() {
        // Update Appium status
        if (this.isAppiumRunning) {
            this.appiumStatusText.textContent = 'Running';
            this.appiumStatusDot.className = 'status-dot running';
        } else {
            this.appiumStatusText.textContent = 'Stopped';
            this.appiumStatusDot.className = 'status-dot stopped';
        }

        // Update Emulator status
        if (this.isEmulatorRunning) {
            this.emulatorStatusText.textContent = 'Running';
            this.emulatorStatusDot.className = 'status-dot running';
        } else {
            this.emulatorStatusText.textContent = 'Stopped';
            this.emulatorStatusDot.className = 'status-dot stopped';
        }

        // Update buttons
        const isAnyRunning = this.isAppiumRunning || this.isEmulatorRunning;

        if (isAnyRunning) {
            this.startAppiumBtn.disabled = true;
            this.startAppiumBtn.innerHTML = '<span class="btn-icon">▶</span>Start';
            this.stopAppiumBtn.disabled = false;
            this.stopAppiumBtn.innerHTML = '<span class="btn-icon">⏹</span>Stop';
        } else {
            this.startAppiumBtn.disabled = false;
            this.startAppiumBtn.innerHTML = '<span class="btn-icon">▶</span>Start';
            this.stopAppiumBtn.disabled = true;
            this.stopAppiumBtn.innerHTML = '<span class="btn-icon">⏹</span>Stop';
        }
    }

    addLogEntry(logType, type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;

        logEntry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${this.escapeHtml(message)}</span>
        `;

        // Add to appropriate log container
        let container;
        switch (logType) {
            case 'appium':
                container = this.appiumLogs;
                break;
            case 'adb':
                container = this.adbLogs;
                break;
            default:
                container = this.localRunnerLogs;
                break;
        }

        container.appendChild(logEntry);
        container.scrollTop = container.scrollHeight;
    }

    switchLogTab(tabName) {
        // Update active tab
        this.activeLogTab = tabName;

        // Update tab buttons
        this.logTabs.forEach((tab) => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update log containers
        this.localRunnerLogs.classList.toggle('active', tabName === 'local-runner');
        this.appiumLogs.classList.toggle('active', tabName === 'appium');
        this.adbLogs.classList.toggle('active', tabName === 'adb');

        // Handle configuration tab
        const configLogs = document.getElementById('config-logs');
        if (configLogs) {
            configLogs.classList.toggle('active', tabName === 'config');
        }

        // Handle results tab
        const resultsLogs = document.getElementById('results-logs');
        if (resultsLogs) {
            resultsLogs.classList.toggle('active', tabName === 'results');
        }
    }

    showAppiumTabs() {
        if (!this.appiumTabsVisible) {
            this.appiumTabsVisible = true;
            // Show Appium and ADB tabs
            const appiumTab = document.querySelector('[data-tab="appium"]');
            const adbTab = document.querySelector('[data-tab="adb"]');

            if (appiumTab) appiumTab.style.display = 'block';
            if (adbTab) adbTab.style.display = 'block';
        }
    }

    showConfigTab() {
        const configTab = document.querySelector('[data-tab="config"]');
        if (configTab) {
            configTab.style.display = 'block';
        }
    }

    showResultsTab() {
        const resultsTab = document.querySelector('[data-tab="results"]');
        if (resultsTab) {
            resultsTab.style.display = 'block';
        }
    }

    clearLogs() {
        // Clear the active log container
        let container;
        switch (this.activeLogTab) {
            case 'appium':
                container = this.appiumLogs;
                break;
            case 'adb':
                container = this.adbLogs;
                break;
            case 'config':
                this.displayConfigPlaceholderInTab();
                this.addLogEntry('local-runner', 'info', 'Configuration viewer cleared');
                return;
            case 'results':
                this.displayResultsPlaceholder();
                this.addLogEntry('local-runner', 'info', 'Test results cleared');
                return;
            default:
                container = this.localRunnerLogs;
                break;
        }

        container.innerHTML = '';

        if (this.activeLogTab === 'local-runner') {
            this.addLogEntry('local-runner', 'info', 'Logs cleared');
        } else {
            this.addLogEntry(this.activeLogTab, 'info', `${this.activeLogTab.toUpperCase()} logs cleared`);
        }
    }

    async loadLibVersion() {
        try {
            const result = await window.electronAPI.getLibVersion();
            if (result.success) {
                this.libVersionElement.textContent = `v${result.version}`;
            } else {
                this.libVersionElement.textContent = 'v?';
            }
        } catch (error) {
            console.error('Failed to load lib version:', error);
            this.libVersionElement.textContent = 'v?';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Configuration Panel Methods
    initializeConfigPanel() {
        // Initialize the config viewer with placeholder (if exists in right panel)
        if (this.configViewer) {
            this.displayConfigPlaceholder();
        }

        // Initialize config tab placeholder
        this.displayConfigPlaceholderInTab();
        this.updateConfigUI();
    }

    selectConfigFile() {
        this.configFileInput.click();
    }

    async handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.selectedConfigFile = file;

        // Show file info
        this.selectedFileName.textContent = file.name;
        this.selectedFilePath.textContent = file.path || 'Unknown path';
        this.selectedFileInfo.style.display = 'block';

        // Clear the configuration view if it's currently active/visible
        const configTab = document.querySelector('[data-tab="config"]');
        if (configTab && configTab.style.display !== 'none') {
            // If config tab is visible, clear it and show placeholder
            this.displayConfigPlaceholderInTab();
        }

        // Don't show the configuration tab automatically - only when "View Configuration" is clicked

        // Try to read file content for viewing
        try {
            const content = await this.readFileContent(file);
            this.configFileContent = content;

            // If configuration tab is currently active, automatically update it with new content
            if (this.activeLogTab === 'config') {
                this.displayConfigContentInTab(this.formatConfigContent(content, file.name));
                this.addLogEntry('local-runner', 'info', `Configuration updated: ${file.name}`);
            }

            this.updateConfigUI();
        } catch (error) {
            console.error('Error reading file:', error);
            this.configFileContent = null;

            // If configuration tab is currently active, show error
            if (this.activeLogTab === 'config') {
                this.displayConfigErrorInTab(`Error reading file: ${error.message}`);
            }

            this.updateConfigUI();
            this.addLogEntry('local-runner', 'error', `Failed to read configuration file: ${error.message}`);
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    formatConfigContent(content, fileName) {
        const fileNameLower = fileName.toLowerCase();

        // For JSON files, try to return parsed object for JSON editor
        if (fileNameLower.endsWith('.json')) {
            try {
                return JSON.parse(content);
            } catch (jsonError) {
                // If JSON parsing fails, return raw content
                console.warn('Failed to parse JSON:', jsonError);
                return content;
            }
        }

        // For non-JSON files, return as-is
        return content;
    }

    updateConfigUI() {
        // Enable/disable send button based on server status and file selection
        if (this.sendConfigBtn) {
            this.sendConfigBtn.disabled = !this.isServerRunning || !this.selectedConfigFile;
        }

        // Enable/disable view button based on file selection
        if (this.viewConfigBtn) {
            this.viewConfigBtn.disabled = !this.selectedConfigFile;
        }
    }

    async sendConfigToRunner() {
        if (!this.selectedConfigFile || !this.isServerRunning) {
            this.addLogEntry(
                'local-runner',
                'error',
                'Cannot send configuration: Local runner not running or no file selected'
            );
            return;
        }

        try {
            this.sendConfigBtn.disabled = true;
            this.sendConfigBtn.innerHTML = '<span class="btn-icon">⏳</span>Sending...';

            const result = await window.electronAPI.sendConfigToRunner({
                fileName: this.selectedConfigFile.name,
                filePath: this.selectedConfigFile.path,
                content: this.configFileContent
            });

            if (result.success) {
                this.addLogEntry(
                    'local-runner',
                    'info',
                    `Configuration sent successfully: ${this.selectedConfigFile.name}`
                );
            } else {
                this.addLogEntry('local-runner', 'error', `Failed to send configuration: ${result.message}`);
            }
        } catch (error) {
            this.addLogEntry('local-runner', 'error', `Error sending configuration: ${error.message}`);
        } finally {
            this.updateConfigUI();
            this.sendConfigBtn.innerHTML = '<span class="btn-icon">🚀</span>Send to Local Runner';
        }
    }

    viewConfiguration() {
        if (!this.selectedConfigFile || !this.configFileContent) {
            // Show config tab and display error
            this.showConfigTab();
            this.switchLogTab('config');
            this.displayConfigErrorInTab('No configuration file selected or content unavailable');
            return;
        }

        try {
            // Show the configuration tab and switch to it
            this.showConfigTab();
            this.switchLogTab('config');

            // Format and display the content
            const formattedContent = this.formatConfigContent(this.configFileContent, this.selectedConfigFile.name);
            this.displayConfigContentInTab(formattedContent);
            this.addLogEntry('local-runner', 'info', `Viewing configuration: ${this.selectedConfigFile.name}`);
        } catch (error) {
            this.showConfigTab();
            this.switchLogTab('config');
            this.displayConfigErrorInTab(`Error displaying configuration: ${error.message}`);
        }
    }

    displayConfigContent(content) {
        this.configViewer.innerHTML = '';
        this.configViewer.className = 'config-viewer has-content';
        this.configViewer.textContent = content;
    }

    displayConfigError(errorMessage) {
        this.configViewer.innerHTML = '';
        this.configViewer.className = 'config-viewer error';
        this.configViewer.textContent = errorMessage;
    }

    displayConfigPlaceholder() {
        this.configViewer.innerHTML = `
            <div class="config-placeholder">
                <span class="placeholder-icon">📋</span>
                <p>Select a configuration file to view its contents</p>
            </div>
        `;
        this.configViewer.className = 'config-viewer';
    }

    // New methods for configuration tab
    displayConfigContentInTab(content) {
        const configLogs = document.getElementById('config-logs');
        if (configLogs) {
            configLogs.innerHTML = '';

            try {
                // Parse JSON content
                let jsonData;
                if (typeof content === 'string') {
                    jsonData = JSON.parse(content);
                } else {
                    jsonData = content;
                }

                // Create container for JSON editor
                const editorContainer = document.createElement('div');
                editorContainer.className = 'json-editor-container';
                configLogs.appendChild(editorContainer);

                // Destroy existing editor if any
                if (this.jsonEditor) {
                    this.jsonEditor.destroy();
                }

                // Create JSON editor
                if (typeof JSONEditor === 'undefined') {
                    throw new Error('JSONEditor library not loaded');
                }

                const options = {
                    mode: 'view', // Read-only mode
                    modes: ['view', 'tree'], // Available modes
                    navigationBar: false,
                    statusBar: false,
                    mainMenuBar: false,
                    enableSort: false,
                    enableTransform: false,
                    onError: (error) => {
                        console.error('JSON Editor Error:', error);
                        this.displayConfigErrorInTab('Error displaying JSON: ' + error.message);
                    }
                };

                this.jsonEditor = new JSONEditor(editorContainer, options);
                this.jsonEditor.set(jsonData);
            } catch (error) {
                // If JSON parsing fails, show as plain text with error
                console.warn('Failed to parse as JSON, showing as plain text:', error);

                const configViewer = document.createElement('div');
                configViewer.className = 'config-viewer has-content';
                configViewer.innerHTML = `
                    <div style="color: #ff9800; margin-bottom: 10px; font-weight: bold;">
                        ⚠️ Not valid JSON - showing as plain text
                    </div>
                    <pre style="white-space: pre-wrap; word-break: break-word;">${this.escapeHtml(content)}</pre>
                `;
                configLogs.appendChild(configViewer);
            }
        }
    }

    displayConfigErrorInTab(errorMessage) {
        const configLogs = document.getElementById('config-logs');
        if (configLogs) {
            configLogs.innerHTML = '';

            // Destroy existing editor if any
            if (this.jsonEditor) {
                this.jsonEditor.destroy();
                this.jsonEditor = null;
            }

            // Create the config viewer element with error styling
            const configViewer = document.createElement('div');
            configViewer.className = 'config-viewer error';
            configViewer.textContent = errorMessage;

            configLogs.appendChild(configViewer);
        }
    }

    displayConfigPlaceholderInTab() {
        const configLogs = document.getElementById('config-logs');
        if (configLogs) {
            configLogs.innerHTML = '';

            // Destroy existing editor if any
            if (this.jsonEditor) {
                this.jsonEditor.destroy();
                this.jsonEditor = null;
            }

            // Create the config viewer element with placeholder
            const configViewer = document.createElement('div');
            configViewer.className = 'config-viewer';
            configViewer.innerHTML = `
                <div class="config-placeholder">
                    <span class="placeholder-icon">📋</span>
                    <p>Select a configuration file to view its contents</p>
                </div>
            `;

            configLogs.appendChild(configViewer);
        }
    }

    // Test Results Display Methods
    displayTestResults(results) {
        const resultsLogs = document.getElementById('results-logs');
        if (!resultsLogs) return;

        // Show the results tab and switch to it
        this.showResultsTab();
        this.switchLogTab('results');

        // Create the results display
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'test-results';

        // Generate results HTML
        resultsContainer.innerHTML = this.generateResultsHTML(results);

        // Replace content
        resultsLogs.innerHTML = '';
        resultsLogs.appendChild(resultsContainer);

        // Add event listeners for expandable suites
        this.addResultsEventListeners(resultsContainer);

        // Log the results update
        this.addLogEntry('local-runner', 'info', `Test results updated: ${results.name}`);
    }

    generateResultsHTML(results) {
        const statusIcon = results.success ? '✅' : '❌';
        const statusClass = results.success ? 'success' : 'failed';

        return `
            <div class="results-header">
                <div class="results-title">
                    <span class="status-icon ${statusClass}">${statusIcon}</span>
                    <span>${results.name}</span>
                </div>
                
                <div class="results-summary">
                    <div class="summary-item total">
                        <div class="summary-value">${results.summary.total}</div>
                        <div class="summary-label">Total Tests</div>
                    </div>
                    <div class="summary-item passed">
                        <div class="summary-value">${results.summary.passed}</div>
                        <div class="summary-label">Passed</div>
                    </div>
                    <div class="summary-item failed">
                        <div class="summary-value">${results.summary.failed}</div>
                        <div class="summary-label">Failed</div>
                    </div>
                    <div class="summary-item skipped">
                        <div class="summary-value">${results.summary.skipped}</div>
                        <div class="summary-label">Skipped</div>
                    </div>
                    <div class="summary-item pending">
                        <div class="summary-value">${results.summary.pending}</div>
                        <div class="summary-label">Pending</div>
                    </div>
                    <div class="summary-item total">
                        <div class="summary-value">${results.summary.suites}</div>
                        <div class="summary-label">Total Suites</div>
                    </div>
                    <div class="summary-item passed">
                        <div class="summary-value">${results.summary.passedSuites}</div>
                        <div class="summary-label">Passed Suites</div>
                    </div>
                </div>

                ${results.error ? `<div class="test-error">${this.escapeHtml(results.error)}</div>` : ''}
            </div>

            <div class="suites-container">
                ${results.suiteResults.map((suite) => this.generateSuiteHTML(suite)).join('')}
            </div>
        `;
    }

    generateSuiteHTML(suite) {
        const statusClass = suite.success ? 'passed' : 'failed';
        const statusIcon = suite.success ? '✅' : '❌';

        return `
            <div class="suite-item ${statusClass}" data-suite="${suite.name}">
                <div class="suite-header" onclick="toggleSuiteDetails(this)">
                    <div class="suite-name">
                        <span class="status-icon">${statusIcon}</span>
                        ${this.escapeHtml(suite.name)}
                    </div>
                    <div class="suite-stats">
                        <span>Total: ${suite.summary.total}</span>
                        <span>Passed: ${suite.summary.passed}</span>
                        <span>Failed: ${suite.summary.failed}</span>
                        <span class="expand-indicator">▶</span>
                    </div>
                </div>
                <div class="suite-details">
                    ${suite.details.map((detail) => this.generateTestDetailHTML(detail)).join('')}
                </div>
            </div>
        `;
    }

    generateTestDetailHTML(detail) {
        const statusClass = this.getTestStatusClass(detail.status);
        const isFailed = statusClass === 'failed';

        return `
            <div class="test-detail ${statusClass}">
                <div class="test-name">${this.escapeHtml(detail.name)}</div>
                <div class="test-status ${statusClass}">${detail.status}</div>
                
                ${detail.error ? `<div class="test-error">${this.escapeHtml(detail.error)}</div>` : ''}
                
                ${
                    isFailed && detail.failedStep
                        ? `
                    <div class="failed-step">
                        <div class="step-info"><span class="step-label">Step:</span> ${detail.failedStep.sequence}</div>
                        <div class="step-info"><span class="step-label">Command:</span> ${this.escapeHtml(detail.failedStep.command)}</div>
                        <div class="step-info"><span class="step-label">Target:</span> ${this.escapeHtml(detail.failedStep.target)}</div>
                        ${detail.failedStep.url ? `<div class="step-info"><span class="step-label">URL:</span> ${this.escapeHtml(detail.failedStep.url)}</div>` : ''}
                        ${detail.failedStep.error ? `<div class="test-error">${this.escapeHtml(detail.failedStep.error)}</div>` : ''}
                    </div>
                `
                        : ''
                }
            </div>
        `;
    }

    getTestStatusClass(status) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('pass')) return 'passed';
        if (statusLower.includes('fail')) return 'failed';
        if (statusLower.includes('skip')) return 'skipped';
        if (statusLower.includes('pending')) return 'pending';
        return 'unknown';
    }

    addResultsEventListeners(_container) {
        // Make suite toggle function available globally
        window.toggleSuiteDetails = (headerElement) => {
            const suiteItem = headerElement.closest('.suite-item');
            const details = suiteItem.querySelector('.suite-details');
            const indicator = headerElement.querySelector('.expand-indicator');

            if (details.classList.contains('expanded')) {
                details.classList.remove('expanded');
                indicator.classList.remove('expanded');
            } else {
                details.classList.add('expanded');
                indicator.classList.add('expanded');
            }
        };
    }

    displayResultsPlaceholder() {
        const resultsLogs = document.getElementById('results-logs');
        if (resultsLogs) {
            resultsLogs.innerHTML = `
                <div class="results-placeholder">
                    <span class="placeholder-icon">📊</span>
                    <p>No test results available yet. Run a test configuration to see results.</p>
                </div>
            `;
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TestRunnerUI();
});
