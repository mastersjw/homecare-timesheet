const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let settingsWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

function createSettingsWindow() {
  // Don't create multiple settings windows
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 650,
    height: 500,
    parent: mainWindow,
    modal: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWindow.loadFile('settings.html');
  settingsWindow.setMenuBarVisibility(false);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Check for updates after the window is created
  // Don't auto-download, let the user decide
  autoUpdater.autoDownload = false;

  // Check for updates when app starts (with a small delay to ensure UI is ready)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  // Send update info to renderer
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('No updates available');
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  const logMsg = `Download progress - ${Math.round(progressObj.percent)}% (${progressObj.transferred}/${progressObj.total} bytes) - Speed: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s`;
  console.log(logMsg);
  // Send progress to renderer
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  // Send download complete notification to renderer
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

// Get default save directory (user's AppData folder)
const defaultSaveDir = app.getPath('userData');
const timesheetDir = path.join(defaultSaveDir, 'saves');
const settingsFile = path.join(defaultSaveDir, 'settings.json');

// Create directory if it doesn't exist
if (!fs.existsSync(timesheetDir)) {
  fs.mkdirSync(timesheetDir, { recursive: true });
}

// IPC handlers
ipcMain.handle('save-timesheet', async (event, data) => {
  // Generate default filename from pay period
  let defaultFilename = 'timesheet.json';
  if (data.payPeriod) {
    defaultFilename = `timesheet-${data.payPeriod.replace(/\//g, '-')}.json`;
  }

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Timesheet',
    defaultPath: path.join(timesheetDir, defaultFilename),
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('check-timesheet-exists', async (event, payPeriod) => {
  // Use template.json for Template, otherwise use the pay period
  const filename = payPeriod === 'Template' ? 'template.json' : `timesheet-${payPeriod.replace(/\//g, '-')}.json`;
  const filePath = path.join(timesheetDir, filename);

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { exists: true, data: JSON.parse(data), filePath };
    }
  } catch (error) {
    // File doesn't exist or can't be read
  }
  return { exists: false };
});

// Auto-save without dialog
ipcMain.handle('auto-save-timesheet', async (event, data) => {
  if (!data.payPeriod) {
    return { success: false, error: 'No pay period selected' };
  }

  // Use template.json for Template, otherwise use the pay period
  const filename = data.payPeriod === 'Template' ? 'template.json' : `timesheet-${data.payPeriod.replace(/\//g, '-')}.json`;
  const filePath = path.join(timesheetDir, filename);

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-timesheet', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Load Timesheet',
    defaultPath: timesheetDir,
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ],
    properties: ['openFile']
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const data = fs.readFileSync(filePaths[0], 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('export-pdf', async (event, pdfData) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export to PDF',
    defaultPath: `timesheet-${new Date().toISOString().split('T')[0]}.pdf`,
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ]
  });

  if (!canceled && filePath) {
    try {
      const base64Data = pdfData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

// Open settings window
ipcMain.handle('open-settings', () => {
  createSettingsWindow();
  return { success: true };
});

// Close settings window
ipcMain.handle('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
  return { success: true };
});

// Save settings
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));

    // Notify main window that settings have changed
    if (mainWindow) {
      mainWindow.webContents.send('settings-updated', settings);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load settings
ipcMain.handle('load-settings', async () => {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf8');
      const settings = JSON.parse(data);
      return { success: true, settings };
    }
    // Return default settings if file doesn't exist
    return {
      success: true,
      settings: {
        employeeName: '',
        autoFillFromTemplate: false,
        showAddHoursButton: false,
        salaryMode: false
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auto-updater IPC handlers
ipcMain.handle('download-update', async () => {
  try {
    console.log('Starting update download...');
    const result = await autoUpdater.downloadUpdate();
    console.log('Download started successfully:', result);
    return { success: true };
  } catch (error) {
    console.error('Download update error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
  return { success: true };
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Manual update check with detailed logging
ipcMain.handle('check-for-updates-manual', async () => {
  try {
    console.log('Manual update check triggered');
    console.log('Current version:', app.getVersion());
    console.log('Update feed URL:', autoUpdater.getFeedURL());

    const result = await autoUpdater.checkForUpdates();
    console.log('Update check result:', result);

    return {
      success: true,
      currentVersion: app.getVersion(),
      updateInfo: result ? result.updateInfo : null
    };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return {
      success: false,
      error: error.message,
      currentVersion: app.getVersion()
    };
  }
});
