class TestRunnerUI {
    constructor() {
        this.isServerRunning = false;
        this.isAppiumRunning = false;
        this.isEmulatorRunning = false;
        this.activeLogTab = 'local-runner';
        this.appiumTabsVisible = false;
        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.updateServerStatus();
        this.updateAppiumStatus();
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

        // Listen for server events
        window.electronAPI.onServerLog((data) => {
            this.addLogEntry('local-runner', data.type, data.message);
        });

        window.electronAPI.onServerStatus((data) => {
            this.isServerRunning = data.running;
            this.updateUI();
        });

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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TestRunnerUI();
});
