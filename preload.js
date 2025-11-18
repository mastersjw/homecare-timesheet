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
  onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (event, settings) => callback(settings))
});
