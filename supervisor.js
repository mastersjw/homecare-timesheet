// Supervisor Dashboard JavaScript

// State management
let supervisorToken = null;
let supervisorInfo = null;
let currentTimesheetId = null;
let supervisorSignatureCanvas = null;
let supervisorSignatureContext = null;
let isDrawing = false;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const supervisorNameSpan = document.getElementById('supervisorName');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize API client
    await window.timesheetAPI.initialize();

    // Check for existing session
    checkExistingSession();

    // Setup event listeners
    setupEventListeners();

    // Initialize signature canvas
    initializeSupervisorSignatureCanvas();
});

// Check for existing session
function checkExistingSession() {
    const savedToken = localStorage.getItem('supervisorToken');
    const savedInfo = localStorage.getItem('supervisorInfo');

    if (savedToken && savedInfo) {
        supervisorToken = savedToken;
        supervisorInfo = JSON.parse(savedInfo);
        showDashboard();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', showLogoutModal);
    document.getElementById('logoutCancelBtn').addEventListener('click', hideLogoutModal);
    document.getElementById('logoutConfirmBtn').addEventListener('click', confirmLogout);

    // Delete modal
    document.getElementById('deleteCancelBtn').addEventListener('click', hideDeleteModal);
    document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);

    // Back to employee mode
    document.getElementById('backToEmployeeBtn').addEventListener('click', () => {
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.closeSupervisor();
        }
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Refresh buttons
    document.getElementById('refreshPendingBtn').addEventListener('click', () => loadPendingTimesheets());
    document.getElementById('refreshApprovedBtn').addEventListener('click', () => loadApprovedTimesheets());
    document.getElementById('refreshRejectedBtn').addEventListener('click', () => loadRejectedTimesheets());

    // Review modal
    document.getElementById('closeReviewBtn').addEventListener('click', closeReviewModal);
    document.getElementById('cancelReviewBtn').addEventListener('click', closeReviewModal);
    document.getElementById('approveBtn').addEventListener('click', handleApproveClick);
    document.getElementById('rejectBtn').addEventListener('click', handleRejectClick);
    document.getElementById('printReviewBtn').addEventListener('click', handlePrintReview);

    // Signature modal
    document.getElementById('supervisorSignatureClearBtn').addEventListener('click', clearSupervisorSignature);
    document.getElementById('supervisorSignatureCancelBtn').addEventListener('click', closeSupervisorSignatureModal);
    document.getElementById('supervisorSignatureSaveBtn').addEventListener('click', handleSupervisorSignatureSave);

    // Reject modal
    document.getElementById('rejectCancelBtn').addEventListener('click', closeRejectModal);
    document.getElementById('rejectConfirmBtn').addEventListener('click', handleRejectConfirm);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        // Check if server URL is configured
        if (!window.timesheetAPI.serverUrl) {
            showLoginError('Server URL not configured. Please configure it in Options/Settings.');
            return;
        }

        const result = await window.timesheetAPI.supervisorLogin(username, password);

        if (result.success) {
            supervisorToken = result.token;
            supervisorInfo = result.supervisor;

            if (rememberMe) {
                localStorage.setItem('supervisorToken', supervisorToken);
                localStorage.setItem('supervisorInfo', JSON.stringify(supervisorInfo));
            }

            showDashboard();
        } else {
            showLoginError(result.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.message === 'Server URL not configured') {
            showLoginError('Server URL not configured. Please go to Options and set your server URL.');
        } else if (error.message.includes('fetch')) {
            showLoginError(`Cannot connect to server at ${window.timesheetAPI.serverUrl}. Please check if the server is running and the URL is correct.`);
        } else {
            showLoginError('Failed to connect to server: ' + error.message);
        }
    }
}

// Show logout modal
function showLogoutModal() {
    document.getElementById('logoutModal').style.display = 'flex';
}

// Hide logout modal
function hideLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

// Confirm logout
async function confirmLogout() {
    // Hide the modal first
    hideLogoutModal();

    // Clear all session data
    supervisorToken = null;
    supervisorInfo = null;
    localStorage.removeItem('supervisorToken');
    localStorage.removeItem('supervisorInfo');

    // Clear API client token
    if (window.timesheetAPI) {
        window.timesheetAPI.token = null;
    }

    // Show login screen
    await showLoginScreen();
}

// Delete Modal Functions
let deleteTimesheetId = null;

// Show delete modal
function showDeleteModal(timesheetId, employeeName, payPeriod) {
    deleteTimesheetId = timesheetId;
    const message = `Are you sure you want to delete the timesheet for ${employeeName} (${payPeriod})?`;
    document.getElementById('deleteModalMessage').textContent = message;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Hide delete modal
function hideDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteTimesheetId = null;
}

// Confirm delete
async function confirmDelete() {
    if (!deleteTimesheetId) {
        return;
    }

    try {
        const result = await window.timesheetAPI.deleteTimesheet(deleteTimesheetId, supervisorToken);

        if (result.success) {
            hideDeleteModal();

            // Reload the current tab
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            if (activeTab === 'pending') {
                loadPendingTimesheets();
            } else if (activeTab === 'approved') {
                loadApprovedTimesheets();
            } else if (activeTab === 'rejected') {
                loadRejectedTimesheets();
            }

            alert('Timesheet deleted successfully');
        } else {
            alert('Failed to delete timesheet: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        alert('Error deleting timesheet');
    }
}

// Show login error
function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

// Show login screen
async function showLoginScreen() {
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';

    // Get input elements
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    // Clear form and errors
    loginForm.reset();
    loginError.style.display = 'none';
    loginError.textContent = '';

    // Ensure form inputs are fully interactive
    if (usernameInput) {
        usernameInput.disabled = false;
        usernameInput.readOnly = false;
        usernameInput.removeAttribute('disabled');
        usernameInput.removeAttribute('readonly');
    }
    if (passwordInput) {
        passwordInput.disabled = false;
        passwordInput.readOnly = false;
        passwordInput.removeAttribute('disabled');
        passwordInput.removeAttribute('readonly');
    }
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('disabled');
    }

    // Re-initialize API client to ensure server URL is loaded
    if (window.timesheetAPI) {
        await window.timesheetAPI.initialize();
    }

    // Force the Electron window to focus first
    if (typeof window.electronAPI !== 'undefined') {
        await window.electronAPI.focusSupervisor();
    }

    // Then force browser focus
    window.focus();
    document.body.focus();

    // Focus on username field with multiple attempts
    if (usernameInput) {
        // Try immediate focus
        usernameInput.focus();

        // Try after a short delay
        setTimeout(() => {
            usernameInput.focus();
            usernameInput.click();
        }, 50);

        // Try after a longer delay as fallback
        setTimeout(() => {
            usernameInput.focus();
        }, 200);
    }
}

// Show dashboard
function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
    supervisorNameSpan.textContent = supervisorInfo.full_name || supervisorInfo.username;

    // Load pending timesheets by default
    loadPendingTimesheets();
}

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Load data for the selected tab
    if (tabName === 'pending') {
        loadPendingTimesheets();
    } else if (tabName === 'approved') {
        loadApprovedTimesheets();
    } else if (tabName === 'rejected') {
        loadRejectedTimesheets();
    }
}

// Load pending timesheets
async function loadPendingTimesheets() {
    const tbody = document.getElementById('pendingTimesheetsBody');
    tbody.innerHTML = '<tr class="no-data"><td colspan="6">Loading...</td></tr>';

    try {
        const result = await window.timesheetAPI.getPendingTimesheets(supervisorToken);

        if (result.success && result.timesheets) {
            if (result.timesheets.length === 0) {
                tbody.innerHTML = '<tr class="no-data"><td colspan="6">No pending timesheets</td></tr>';
            } else {
                tbody.innerHTML = result.timesheets.map(ts => `
                    <tr>
                        <td><input type="checkbox" class="timesheet-checkbox pending-checkbox" data-id="${ts.id}"></td>
                        <td>${escapeHtml(ts.employee_name)}</td>
                        <td>${escapeHtml(ts.pay_period)}</td>
                        <td>${formatDate(ts.submitted_at)}</td>
                        <td>${calculateTotalHours(ts.timesheet_data)}</td>
                        <td>
                            <button class="btn action-btn btn-primary" onclick="viewTimesheet('${ts.id}')">Review</button>
                            <button class="btn action-btn btn-danger" onclick="showDeleteModal('${ts.id}', '${escapeHtml(ts.employee_name)}', '${escapeHtml(ts.pay_period)}')">Delete</button>
                        </td>
                    </tr>
                `).join('');
                updatePrintButtonVisibility('pending');
            }
        } else {
            tbody.innerHTML = '<tr class="no-data"><td colspan="6">Failed to load timesheets</td></tr>';
        }
    } catch (error) {
        console.error('Error loading pending timesheets:', error);
        tbody.innerHTML = '<tr class="no-data"><td colspan="6">Error loading timesheets</td></tr>';
    }
}

// Load approved timesheets
async function loadApprovedTimesheets() {
    const tbody = document.getElementById('approvedTimesheetsBody');
    tbody.innerHTML = '<tr class="no-data"><td colspan="7">Loading...</td></tr>';

    try {
        const result = await window.timesheetAPI.getApprovedTimesheets(supervisorToken);

        if (result.success && result.timesheets) {
            if (result.timesheets.length === 0) {
                tbody.innerHTML = '<tr class="no-data"><td colspan="7">No approved timesheets</td></tr>';
            } else {
                tbody.innerHTML = result.timesheets.map(ts => `
                    <tr>
                        <td><input type="checkbox" class="timesheet-checkbox approved-checkbox" data-id="${ts.id}"></td>
                        <td>${escapeHtml(ts.employee_name)}</td>
                        <td>${escapeHtml(ts.pay_period)}</td>
                        <td>${formatDate(ts.submitted_at)}</td>
                        <td>${formatDate(ts.approved_at)}</td>
                        <td>${calculateTotalHours(ts.timesheet_data)}</td>
                        <td>
                            <button class="btn action-btn" onclick="viewTimesheet('${ts.id}')">View</button>
                            <button class="btn action-btn" onclick="printTimesheet('${ts.id}')">Print</button>
                            <button class="btn action-btn btn-danger" onclick="showDeleteModal('${ts.id}', '${escapeHtml(ts.employee_name)}', '${escapeHtml(ts.pay_period)}')">Delete</button>
                        </td>
                    </tr>
                `).join('');
                updatePrintButtonVisibility('approved');
            }
        } else {
            tbody.innerHTML = '<tr class="no-data"><td colspan="7">Failed to load timesheets</td></tr>';
        }
    } catch (error) {
        console.error('Error loading approved timesheets:', error);
        tbody.innerHTML = '<tr class="no-data"><td colspan="7">Error loading timesheets</td></tr>';
    }
}

// Load rejected timesheets
async function loadRejectedTimesheets() {
    const tbody = document.getElementById('rejectedTimesheetsBody');
    tbody.innerHTML = '<tr class="no-data"><td colspan="6">Loading...</td></tr>';

    try {
        const result = await window.timesheetAPI.getRejectedTimesheets(supervisorToken);

        if (result.success && result.timesheets) {
            if (result.timesheets.length === 0) {
                tbody.innerHTML = '<tr class="no-data"><td colspan="6">No rejected timesheets</td></tr>';
            } else {
                tbody.innerHTML = result.timesheets.map(ts => `
                    <tr>
                        <td>${escapeHtml(ts.employee_name)}</td>
                        <td>${escapeHtml(ts.pay_period)}</td>
                        <td>${formatDate(ts.submitted_at)}</td>
                        <td>${formatDate(ts.rejected_at)}</td>
                        <td>${escapeHtml(ts.rejection_reason || 'N/A')}</td>
                        <td>
                            <button class="btn action-btn" onclick="viewTimesheet('${ts.id}')">View</button>
                            <button class="btn action-btn btn-danger" onclick="showDeleteModal('${ts.id}', '${escapeHtml(ts.employee_name)}', '${escapeHtml(ts.pay_period)}')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            tbody.innerHTML = '<tr class="no-data"><td colspan="6">Failed to load timesheets</td></tr>';
        }
    } catch (error) {
        console.error('Error loading rejected timesheets:', error);
        tbody.innerHTML = '<tr class="no-data"><td colspan="6">Error loading timesheets</td></tr>';
    }
}

// View timesheet
async function viewTimesheet(timesheetId) {
    currentTimesheetId = timesheetId;

    try {
        const result = await window.timesheetAPI.getTimesheet(timesheetId, supervisorToken);

        if (result.success && result.timesheet) {
            displayTimesheetInModal(result.timesheet);
        } else {
            alert('Failed to load timesheet');
        }
    } catch (error) {
        console.error('Error loading timesheet:', error);
        alert('Error loading timesheet');
    }
}

// Display timesheet in modal
function displayTimesheetInModal(timesheet) {
    console.log('Timesheet data:', timesheet);
    console.log('Employee signature date:', timesheet.employee_signature_date);
    console.log('Supervisor signature date:', timesheet.supervisor_signature_date);

    // Set employee info
    document.getElementById('reviewEmployeeName').textContent = timesheet.employee_name;
    document.getElementById('reviewPayPeriod').textContent = timesheet.pay_period;

    // Clear previous signatures and dates
    const empSigImg = document.getElementById('reviewEmployeeSignature');
    const empSigDate = document.getElementById('reviewEmployeeSignatureDate');
    const supSigImg = document.getElementById('reviewSupervisorSignature');
    const supSigDate = document.getElementById('reviewSupervisorSignatureDate');

    empSigImg.style.display = 'none';
    empSigDate.textContent = '';
    supSigImg.style.display = 'none';
    supSigDate.textContent = '';

    // Display employee signature
    if (timesheet.employee_signature) {
        empSigImg.src = timesheet.employee_signature;
        empSigImg.style.display = 'block';
    }

    // Display employee signature date
    if (timesheet.employee_signature_date) {
        empSigDate.textContent = timesheet.employee_signature_date;
        empSigDate.style.display = 'inline';
    }

    // Display supervisor signature if exists
    if (timesheet.supervisor_signature) {
        supSigImg.src = timesheet.supervisor_signature;
        supSigImg.style.display = 'block';
    }

    // Display supervisor signature date if exists
    if (timesheet.supervisor_signature_date) {
        supSigDate.textContent = timesheet.supervisor_signature_date;
        supSigDate.style.display = 'inline';
    }

    // Build timecard table
    buildTimecardTable(timesheet.timesheet_data);

    // Show/hide action buttons based on status
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');

    if (timesheet.status === 'pending') {
        approveBtn.style.display = '';
        rejectBtn.style.display = '';
    } else {
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
    }

    // Show modal
    document.getElementById('reviewModal').style.display = 'flex';
}

// Build timecard table
function buildTimecardTable(data) {
    const tbody = document.getElementById('reviewTimecardBody');
    tbody.innerHTML = '';

    // Week 1
    if (data.week1 && Array.isArray(data.week1)) {
        data.week1.forEach((day, index) => {
            const row = createTimecardRow(day, 1, index);
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Week 1 total
        const week1Total = data.week1.reduce((sum, day) => sum + (day.total || 0), 0);
        tbody.insertAdjacentHTML('beforeend', `
            <tr class="total-row">
                <td colspan="2" style="text-align: right; padding-right: 15px;"><strong>Week 1 Total:</strong></td>
                <td class="total-value"><strong>${week1Total.toFixed(2)}</strong></td>
            </tr>
        `);
    }

    // Week 2
    if (data.week2 && Array.isArray(data.week2)) {
        data.week2.forEach((day, index) => {
            const row = createTimecardRow(day, 2, index);
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Week 2 total
        const week2Total = data.week2.reduce((sum, day) => sum + (day.total || 0), 0);
        tbody.insertAdjacentHTML('beforeend', `
            <tr class="total-row">
                <td colspan="2" style="text-align: right; padding-right: 15px;"><strong>Week 2 Total:</strong></td>
                <td class="total-value"><strong>${week2Total.toFixed(2)}</strong></td>
            </tr>
        `);
    }

    // Combined totals
    const week1Total = data.week1 ? data.week1.reduce((sum, day) => sum + (day.total || 0), 0) : 0;
    const week2Total = data.week2 ? data.week2.reduce((sum, day) => sum + (day.total || 0), 0) : 0;
    const totalHours = week1Total + week2Total;
    const regularHours = Math.min(totalHours, 80);
    const overtimeHours = Math.max(0, totalHours - 80);

    tbody.insertAdjacentHTML('beforeend', `
        <tr class="summary-row">
            <td colspan="2" style="text-align: right; padding-right: 15px;"><strong>Total Hours:</strong></td>
            <td class="summary-value"><strong>${totalHours.toFixed(2)}</strong></td>
        </tr>
        <tr class="summary-row">
            <td colspan="2" style="text-align: right; padding-right: 15px;"><strong>Regular Hours:</strong></td>
            <td class="summary-value"><strong>${regularHours.toFixed(2)}</strong></td>
        </tr>
        <tr class="summary-row">
            <td colspan="2" style="text-align: right; padding-right: 15px;"><strong>Overtime Hours:</strong></td>
            <td class="summary-value"><strong>${overtimeHours.toFixed(2)}</strong></td>
        </tr>
        <tr class="summary-row">
            <td colspan="2" style="text-align: right; padding-right: 15px;"><strong>Personal Leave:</strong></td>
            <td class="summary-value"><strong>${(data.personalLeave || 0).toFixed(2)}</strong></td>
        </tr>
    `);
}

// Create timecard row
function createTimecardRow(day, week, index) {
    let hoursDisplay = '';

    // Build time entries display
    if (day.timePairs && day.timePairs.length > 0) {
        hoursDisplay = day.timePairs.map(pair =>
            `${formatTime12Hour(pair.start)} - ${formatTime12Hour(pair.stop)}`
        ).join('<br>');
    }

    // Add hours entries
    if (day.hoursEntries && day.hoursEntries.length > 0) {
        const hoursText = day.hoursEntries.map(entry => `${entry.hours}h - ${entry.description}`).join('<br>');
        hoursDisplay = hoursDisplay ? hoursDisplay + '<br>' + hoursText : hoursText;
    }

    // Handle special day types
    if (day.dayType === 'holiday') {
        hoursDisplay = '<span class="holiday-text">Holiday - Office Closed</span>';
    } else if (day.dayType === 'called-off') {
        hoursDisplay = '<span class="called-off-text">Called Off</span>';
    } else if (day.dayType === 'on-call') {
        hoursDisplay += '<br><span class="on-call-note">(On Call)</span>';
    }

    return `
        <tr>
            <td>${escapeHtml(day.date || '')}</td>
            <td>${hoursDisplay || '-'}</td>
            <td style="text-align: center;">${(day.total || 0).toFixed(2)}</td>
        </tr>
    `;
}

// Close review modal
function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentTimesheetId = null;
}

// Handle approve click
function handleApproveClick() {
    // Show signature modal
    document.getElementById('supervisorSignatureModal').style.display = 'flex';

    // Auto-populate date
    const dateInput = document.getElementById('supervisorSignatureDateInput');
    if (!dateInput.value) {
        const today = new Date();
        dateInput.value = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    }
}

// Handle reject click
function handleRejectClick() {
    document.getElementById('rejectModal').style.display = 'flex';
}

// Handle print review
function handlePrintReview() {
    window.print();
}

// Print timesheet (from approved list)
async function printTimesheet(timesheetId) {
    await viewTimesheet(timesheetId);
    setTimeout(() => {
        window.print();
    }, 500);
}

// Initialize supervisor signature canvas
function initializeSupervisorSignatureCanvas() {
    supervisorSignatureCanvas = document.getElementById('supervisorSignaturePad');
    if (!supervisorSignatureCanvas) return;

    supervisorSignatureContext = supervisorSignatureCanvas.getContext('2d');
    supervisorSignatureContext.strokeStyle = '#000';
    supervisorSignatureContext.lineWidth = 2;
    supervisorSignatureContext.lineCap = 'round';

    // Mouse events
    supervisorSignatureCanvas.addEventListener('mousedown', startDrawingSupervisor);
    supervisorSignatureCanvas.addEventListener('mousemove', drawSupervisor);
    supervisorSignatureCanvas.addEventListener('mouseup', stopDrawingSupervisor);
    supervisorSignatureCanvas.addEventListener('mouseout', stopDrawingSupervisor);

    // Touch events
    supervisorSignatureCanvas.addEventListener('touchstart', startDrawingSupervisor);
    supervisorSignatureCanvas.addEventListener('touchmove', drawSupervisor);
    supervisorSignatureCanvas.addEventListener('touchend', stopDrawingSupervisor);
}

// Signature drawing functions
function startDrawingSupervisor(e) {
    e.preventDefault();
    isDrawing = true;
    const rect = supervisorSignatureCanvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    supervisorSignatureContext.beginPath();
    supervisorSignatureContext.moveTo(x, y);
}

function drawSupervisor(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = supervisorSignatureCanvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    supervisorSignatureContext.lineTo(x, y);
    supervisorSignatureContext.stroke();
}

function stopDrawingSupervisor() {
    isDrawing = false;
}

function clearSupervisorSignature() {
    supervisorSignatureContext.clearRect(0, 0, supervisorSignatureCanvas.width, supervisorSignatureCanvas.height);
}

function isSupervisorSignatureEmpty() {
    const pixelBuffer = new Uint32Array(
        supervisorSignatureContext.getImageData(0, 0, supervisorSignatureCanvas.width, supervisorSignatureCanvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
}

// Close supervisor signature modal
function closeSupervisorSignatureModal() {
    document.getElementById('supervisorSignatureModal').style.display = 'none';
    clearSupervisorSignature();
}

// Handle supervisor signature save
async function handleSupervisorSignatureSave() {
    if (isSupervisorSignatureEmpty()) {
        alert('Please provide a signature before continuing');
        return;
    }

    const signatureDate = document.getElementById('supervisorSignatureDateInput').value;
    if (!signatureDate) {
        alert('Please enter a date');
        return;
    }

    const signatureData = supervisorSignatureCanvas.toDataURL('image/png');

    try {
        const result = await window.timesheetAPI.approveTimesheet(
            currentTimesheetId,
            supervisorToken,
            signatureData,
            signatureDate
        );

        if (result.success) {
            alert('Timesheet approved successfully!');
            closeSupervisorSignatureModal();
            closeReviewModal();
            loadPendingTimesheets();
        } else {
            alert('Failed to approve timesheet: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error approving timesheet:', error);
        alert('Error approving timesheet');
    }
}

// Close reject modal
function closeRejectModal() {
    document.getElementById('rejectModal').style.display = 'none';
    document.getElementById('rejectionReason').value = '';
}

// Handle reject confirm
async function handleRejectConfirm() {
    const reason = document.getElementById('rejectionReason').value.trim();

    if (!reason) {
        alert('Please enter a reason for rejection');
        return;
    }

    try {
        const result = await window.timesheetAPI.rejectTimesheet(
            currentTimesheetId,
            supervisorToken,
            reason
        );

        if (result.success) {
            alert('Timesheet rejected');
            closeRejectModal();
            closeReviewModal();
            loadPendingTimesheets();
        } else {
            alert('Failed to reject timesheet: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error rejecting timesheet:', error);
        alert('Error rejecting timesheet');
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime12Hour(time24) {
    if (!time24) return '';

    // Handle if it's already in 12-hour format
    if (time24.toLowerCase().includes('am') || time24.toLowerCase().includes('pm')) {
        return time24;
    }

    const [hours, minutes] = time24.split(':');
    let hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;
    hour = hour ? hour : 12; // 0 should be 12

    return `${hour}:${minutes} ${ampm}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function calculateTotalHours(data) {
    if (!data) return '0.00';
    const week1Total = data.week1 ? data.week1.reduce((sum, day) => sum + (day.total || 0), 0) : 0;
    const week2Total = data.week2 ? data.week2.reduce((sum, day) => sum + (day.total || 0), 0) : 0;
    return (week1Total + week2Total).toFixed(2);
}

// Print selected functionality
function updatePrintButtonVisibility(tab) {
    const checkboxes = document.querySelectorAll(`.${tab}-checkbox`);
    const printBtn = document.getElementById(`printSelected${tab.charAt(0).toUpperCase() + tab.slice(1)}Btn`);

    if (!printBtn) return;

    // Add change listeners to all checkboxes
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll(`.${tab}-checkbox:checked`).length;
            printBtn.style.display = checkedCount > 0 ? '' : 'none';
        });
    });
}

// Select all functionality
document.addEventListener('DOMContentLoaded', () => {
    // Select all pending
    const selectAllPending = document.getElementById('selectAllPending');
    if (selectAllPending) {
        selectAllPending.addEventListener('change', (e) => {
            document.querySelectorAll('.pending-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
            const printBtn = document.getElementById('printSelectedPendingBtn');
            if (printBtn) {
                printBtn.style.display = e.target.checked && document.querySelectorAll('.pending-checkbox').length > 0 ? '' : 'none';
            }
        });
    }

    // Select all approved
    const selectAllApproved = document.getElementById('selectAllApproved');
    if (selectAllApproved) {
        selectAllApproved.addEventListener('change', (e) => {
            document.querySelectorAll('.approved-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
            const printBtn = document.getElementById('printSelectedApprovedBtn');
            if (printBtn) {
                printBtn.style.display = e.target.checked && document.querySelectorAll('.approved-checkbox').length > 0 ? '' : 'none';
            }
        });
    }

    // Print selected pending button
    const printSelectedPendingBtn = document.getElementById('printSelectedPendingBtn');
    if (printSelectedPendingBtn) {
        printSelectedPendingBtn.addEventListener('click', () => printSelectedTimesheets('pending'));
    }

    // Print selected approved button
    const printSelectedApprovedBtn = document.getElementById('printSelectedApprovedBtn');
    if (printSelectedApprovedBtn) {
        printSelectedApprovedBtn.addEventListener('click', () => printSelectedTimesheets('approved'));
    }
});

// Print selected timesheets
async function printSelectedTimesheets(tab) {
    const checkboxes = document.querySelectorAll(`.${tab}-checkbox:checked`);
    const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);

    if (selectedIds.length === 0) {
        alert('Please select at least one timesheet to print');
        return;
    }

    // Create a printable container positioned off-screen
    const printContainer = document.createElement('div');
    printContainer.id = 'printContainer';
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    document.body.appendChild(printContainer);

    try {
        // Fetch and render each timesheet
        for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            const result = await window.timesheetAPI.getTimesheet(id, supervisorToken);

            if (result.success && result.timesheet) {
                const timesheetHtml = generatePrintableTimesheet(result.timesheet);

                // Add page break after each timesheet except the last one
                const pageBreak = i < selectedIds.length - 1 ? '<div style="page-break-after: always;"></div>' : '';

                printContainer.innerHTML += timesheetHtml + pageBreak;
            }
        }

        // Open print dialog
        setTimeout(() => {
            window.print();

            // Clean up after printing
            setTimeout(() => {
                if (printContainer && printContainer.parentNode) {
                    document.body.removeChild(printContainer);
                }
            }, 100);
        }, 500);

    } catch (error) {
        console.error('Error printing selected timesheets:', error);
        alert('Error loading timesheets for printing');
        if (printContainer && printContainer.parentNode) {
            document.body.removeChild(printContainer);
        }
    }
}

// Generate printable HTML for a timesheet
function generatePrintableTimesheet(timesheet) {
    const data = timesheet.timesheet_data;

    // Build week 1 rows
    let week1Rows = '';
    if (data.week1 && Array.isArray(data.week1)) {
        week1Rows = data.week1.map(day => {
            let hoursDisplay = '';
            if (day.timePairs && day.timePairs.length > 0) {
                hoursDisplay = day.timePairs.map(pair =>
                    `${formatTime12Hour(pair.start)} - ${formatTime12Hour(pair.stop)}`
                ).join('<br>');
            }
            if (day.hoursEntries && day.hoursEntries.length > 0) {
                const hoursText = day.hoursEntries.map(entry => `${entry.hours}h - ${entry.description}`).join('<br>');
                hoursDisplay = hoursDisplay ? hoursDisplay + '<br>' + hoursText : hoursText;
            }
            if (day.dayType === 'holiday') {
                hoursDisplay = '<span>Holiday - Office Closed</span>';
            } else if (day.dayType === 'called-off') {
                hoursDisplay = '<span>Called Off</span>';
            } else if (day.dayType === 'on-call' && hoursDisplay) {
                hoursDisplay += '<br><span>(On Call)</span>';
            }

            return `
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 12px;">${escapeHtml(day.date || '')}</td>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 12px;">${hoursDisplay || '-'}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${(day.total || 0).toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }

    // Calculate week 1 total
    const week1Total = data.week1 ? data.week1.reduce((sum, day) => sum + (day.total || 0), 0) : 0;

    // Build week 2 rows
    let week2Rows = '';
    if (data.week2 && Array.isArray(data.week2)) {
        week2Rows = data.week2.map(day => {
            let hoursDisplay = '';
            if (day.timePairs && day.timePairs.length > 0) {
                hoursDisplay = day.timePairs.map(pair =>
                    `${formatTime12Hour(pair.start)} - ${formatTime12Hour(pair.stop)}`
                ).join('<br>');
            }
            if (day.hoursEntries && day.hoursEntries.length > 0) {
                const hoursText = day.hoursEntries.map(entry => `${entry.hours}h - ${entry.description}`).join('<br>');
                hoursDisplay = hoursDisplay ? hoursDisplay + '<br>' + hoursText : hoursText;
            }
            if (day.dayType === 'holiday') {
                hoursDisplay = '<span>Holiday - Office Closed</span>';
            } else if (day.dayType === 'called-off') {
                hoursDisplay = '<span>Called Off</span>';
            } else if (day.dayType === 'on-call' && hoursDisplay) {
                hoursDisplay += '<br><span>(On Call)</span>';
            }

            return `
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 12px;">${escapeHtml(day.date || '')}</td>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 12px;">${hoursDisplay || '-'}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${(day.total || 0).toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }

    // Calculate totals
    const week2Total = data.week2 ? data.week2.reduce((sum, day) => sum + (day.total || 0), 0) : 0;
    const totalHours = week1Total + week2Total;
    const regularHours = Math.min(totalHours, 80);
    const overtimeHours = Math.max(0, totalHours - 80);

    return `
        <div class="printable-timesheet" style="font-family: 'Times New Roman', Times, serif; padding: 10px 30px; max-width: 850px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2px;">
                <img src="Logo.png" alt="HomeCare Montana" style="max-width: 200px; height: auto;">
            </div>

            <h1 style="text-align: center; margin-bottom: 5px; font-size: 14px;">Inter-Office Time Card</h1>

            <div style="margin-bottom: 20px;">
                <div style="margin-bottom: 8px;"><strong>Name:</strong> ${escapeHtml(timesheet.employee_name)}</div>
                <div style="margin-bottom: 8px;"><strong>Pay Period:</strong> ${escapeHtml(timesheet.pay_period)}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #000; padding: 5px; text-align: left; font-size: 12px;">Date</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: left; font-size: 12px;">Hours: from/to</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${week1Rows}
                    <tr style="font-weight: bold;">
                        <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Week 1 Total:</td>
                        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${week1Total.toFixed(2)}</td>
                    </tr>
                    ${week2Rows}
                    <tr style="font-weight: bold;">
                        <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Week 2 Total:</td>
                        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${week2Total.toFixed(2)}</td>
                    </tr>
                    <tr style="font-weight: bold;">
                        <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Total Hours:</td>
                        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${totalHours.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Regular Hours:</td>
                        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${regularHours.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Overtime Hours:</td>
                        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${overtimeHours.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Personal Leave:</td>
                        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${(data.personalLeave || 0).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: 15px;">
                <div style="margin-bottom: 8px; display: flex; align-items: flex-end; position: relative;">
                    <span style="min-width: 180px; font-size: 13px;">Employee Signature & Date</span>
                    <div style="flex: 1; position: relative; height: 65px; border-bottom: 1px solid #000; margin-right: 5px;">
                        ${timesheet.employee_signature ? `<img src="${timesheet.employee_signature}" style="max-height: 60px; max-width: 200px; position: absolute; left: 10px; bottom: 0;">` : ''}
                    </div>
                    ${timesheet.employee_signature_date ? `<span style="margin-left: 10px; font-size: 13px;">${escapeHtml(timesheet.employee_signature_date)}</span>` : ''}
                </div>

                <div style="margin-bottom: 8px; display: flex; align-items: flex-end; position: relative;">
                    <span style="min-width: 180px; font-size: 13px;">Supervisor Signature & Date</span>
                    <div style="flex: 1; position: relative; height: 65px; border-bottom: 1px solid #000; margin-right: 5px;">
                        ${timesheet.supervisor_signature ? `<img src="${timesheet.supervisor_signature}" style="max-height: 60px; max-width: 200px; position: absolute; left: 10px; bottom: 0;">` : ''}
                    </div>
                    ${timesheet.supervisor_signature_date ? `<span style="margin-left: 10px; font-size: 13px;">${escapeHtml(timesheet.supervisor_signature_date)}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}
