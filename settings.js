// Settings page logic

// Load settings when window opens
async function loadSettings() {
    if (typeof window.electronAPI !== 'undefined') {
        try {
            const result = await window.electronAPI.loadSettings();
            if (result.success && result.settings) {
                // Load employee name
                if (result.settings.employeeName) {
                    document.getElementById('employeeName').value = result.settings.employeeName;
                }

                // Load auto-fill checkbox
                if (result.settings.autoFillFromTemplate !== undefined) {
                    document.getElementById('autoFillFromTemplate').checked = result.settings.autoFillFromTemplate;
                }

                // Load show add hours button checkbox
                if (result.settings.showAddHoursButton !== undefined) {
                    document.getElementById('showAddHoursButton').checked = result.settings.showAddHoursButton;
                }

                // Load salary mode checkbox
                if (result.settings.salaryMode !== undefined) {
                    document.getElementById('salaryMode').checked = result.settings.salaryMode;
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

// Save settings
async function saveSettings() {
    const settings = {
        employeeName: document.getElementById('employeeName').value,
        autoFillFromTemplate: document.getElementById('autoFillFromTemplate').checked,
        showAddHoursButton: document.getElementById('showAddHoursButton').checked,
        salaryMode: document.getElementById('salaryMode').checked
    };

    if (typeof window.electronAPI !== 'undefined') {
        try {
            const result = await window.electronAPI.saveSettings(settings);
            if (result.success) {
                // Close the window
                window.electronAPI.closeSettings();
            } else {
                alert('Error saving settings: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Error saving settings: ' + error.message);
        }
    }
}

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveSettings);

document.getElementById('cancelBtn').addEventListener('click', () => {
    if (typeof window.electronAPI !== 'undefined') {
        window.electronAPI.closeSettings();
    }
});

// Load and display app version
async function loadAppVersion() {
    if (typeof window.electronAPI !== 'undefined') {
        try {
            const version = await window.electronAPI.getAppVersion();
            document.getElementById('appVersion').textContent = version;
        } catch (error) {
            console.error('Error loading app version:', error);
            document.getElementById('appVersion').textContent = 'Unknown';
        }
    }
}

// Check for updates manually
async function checkForUpdates() {
    const statusDiv = document.getElementById('updateStatus');
    const checkBtn = document.getElementById('checkUpdatesBtn');

    if (typeof window.electronAPI !== 'undefined') {
        try {
            checkBtn.disabled = true;
            statusDiv.textContent = 'Checking for updates...';
            statusDiv.style.color = '#666';

            console.log('Triggering manual update check...');
            const result = await window.electronAPI.checkForUpdatesManual();

            console.log('Update check result:', result);

            if (result.success) {
                if (result.updateInfo) {
                    statusDiv.textContent = `Update available: v${result.updateInfo.version}`;
                    statusDiv.style.color = '#4CAF50';
                    console.log('Update found:', result.updateInfo);

                    // Close settings window after a brief delay so user can see the message
                    setTimeout(() => {
                        window.electronAPI.closeSettings();
                    }, 1500);
                } else {
                    statusDiv.textContent = 'No updates available. You have the latest version.';
                    statusDiv.style.color = '#666';
                    console.log('No updates found. Current version:', result.currentVersion);
                }
            } else {
                statusDiv.textContent = `Error: ${result.error}`;
                statusDiv.style.color = '#f44336';
                console.error('Update check error:', result.error);
            }

            checkBtn.disabled = false;
        } catch (error) {
            console.error('Error during manual update check:', error);
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.style.color = '#f44336';
            checkBtn.disabled = false;
        }
    }
}

document.getElementById('checkUpdatesBtn').addEventListener('click', checkForUpdates);

// Load settings on page load
loadSettings();
loadAppVersion();
