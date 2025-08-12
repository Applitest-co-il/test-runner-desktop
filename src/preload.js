const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Server APIs
    startServer: () => ipcRenderer.invoke('start-server'),
    stopServer: () => ipcRenderer.invoke('stop-server'),
    getServerStatus: () => ipcRenderer.invoke('get-server-status'),

    // Appium APIs
    startAppium: (deviceAvd) => ipcRenderer.invoke('start-appium', deviceAvd),
    stopAppium: () => ipcRenderer.invoke('stop-appium'),
    getAppiumStatus: () => ipcRenderer.invoke('get-appium-status'),

    // Event listeners
    onServerLog: (callback) => {
        ipcRenderer.on('server-log', (event, data) => callback(data));
    },
    onServerStatus: (callback) => {
        ipcRenderer.on('server-status', (event, data) => callback(data));
    },
    onAppiumStatus: (callback) => {
        ipcRenderer.on('appium-status', (event, data) => callback(data));
    },
    onAppiumLog: (callback) => {
        ipcRenderer.on('appium-log', (event, data) => callback(data));
    },
    onAdbLog: (callback) => {
        ipcRenderer.on('adb-log', (event, data) => callback(data));
    },

    // Cleanup listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
