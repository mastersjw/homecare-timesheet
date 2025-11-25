const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveTimesheet: (data) => ipcRenderer.invoke('save-timesheet', data),
  autoSaveTimesheet: (data) => ipcRenderer.invoke('auto-save-timesheet', data),
  loadTimesheet: () => ipcRenderer.invoke('load-timesheet'),
  exportPDF: (pdfData) => ipcRenderer.invoke('export-pdf', pdfData),
  checkTimesheetExists: (payPeriod) => ipcRenderer.invoke('check-timesheet-exists', payPeriod),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (event, settings) => callback(settings)),
  // Auto-updater APIs
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // Manual update check
  checkForUpdatesManual: () => ipcRenderer.invoke('check-for-updates-manual')
});
