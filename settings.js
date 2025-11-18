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
        showAddHoursButton: document.getElementById('showAddHoursButton').checked
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

// Load settings on page load
loadSettings();
