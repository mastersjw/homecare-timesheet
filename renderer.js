// Configuration
const DAYS_PER_WEEK = 7;
const REGULAR_HOURS_PER_WEEK = 40;
const PAY_PERIODS_TO_SHOW = 6; // 3 past + current + 2 future

// Initialize the timesheet
let timesheetData = {
    employeeName: '',
    payPeriod: '',
    week1: [],
    week2: [],
    personalLeave: 0
};

// Track current pay period selection
let isCurrentPayPeriod = false;

// Pay period utilities
function getPayPeriodStartDate(referenceDate) {
    // Current pay period: 11/2/2025 - 11/15/2025 (Sunday to Saturday)
    const currentPeriodStart = new Date(2025, 10, 2); // Nov 2, 2025 (month is 0-indexed)
    const ref = new Date(referenceDate);

    // Calculate days difference
    const diffTime = ref.getTime() - currentPeriodStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Find which pay period (14-day cycles)
    const periodNumber = Math.floor(diffDays / 14);

    // Calculate the start of that period
    const periodStart = new Date(currentPeriodStart);
    periodStart.setDate(currentPeriodStart.getDate() + (periodNumber * 14));

    return periodStart;
}

function generatePayPeriods() {
    const periods = [];
    const today = new Date();

    // Get the current pay period start
    const currentPeriodStart = getPayPeriodStartDate(today);

    // Generate 3 past periods, current, and 2 future periods
    for (let i = -3; i <= 2; i++) {
        const periodStart = new Date(currentPeriodStart);
        periodStart.setDate(currentPeriodStart.getDate() + (i * 14));

        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 13); // 14 days total (0-13)

        periods.push({
            start: periodStart,
            end: periodEnd,
            label: `${formatDate(periodStart)} - ${formatDate(periodEnd)}`,
            isCurrent: i === 0
        });
    }

    return periods;
}

function formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

function formatDateForInput(date) {
    // Format as MM/DD/YYYY DayName (e.g., 11/02/2025 Sun)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    return `${month}/${day}/${year} ${dayName}`;
}

function populatePayPeriodDropdown() {
    const selector = document.getElementById('payPeriodSelector');
    const periods = generatePayPeriods();

    selector.innerHTML = '<option value="">Select Pay Period</option>';

    // Add Template option as first option
    const templateOption = document.createElement('option');
    templateOption.value = JSON.stringify({ isTemplate: true, label: 'Template' });
    templateOption.textContent = 'Template';
    templateOption.setAttribute('data-label', 'Template');
    selector.appendChild(templateOption);

    periods.forEach((period, index) => {
        const option = document.createElement('option');
        option.value = JSON.stringify(period);
        option.textContent = period.label + (period.isCurrent ? ' (Current)' : '');
        option.setAttribute('data-label', period.label); // Store clean label for printing
        if (period.isCurrent) {
            option.selected = true;
        }
        selector.appendChild(option);
    });

    // Trigger change event to populate dates for current period
    if (periods.length > 0) {
        selector.dispatchEvent(new Event('change'));
    }
}

function fillDatesForPayPeriod(periodData) {
    if (!periodData) return;

    const period = typeof periodData === 'string' ? JSON.parse(periodData) : periodData;

    // If this is a template, clear all dates
    if (period.isTemplate) {
        // Clear Week 1 dates
        for (let i = 0; i < DAYS_PER_WEEK; i++) {
            const dateInput = document.querySelector(`input.date-input[data-week="1"][data-day="${i}"]`);
            if (dateInput) {
                dateInput.value = '';
            }
        }

        // Clear Week 2 dates
        for (let i = 0; i < DAYS_PER_WEEK; i++) {
            const dateInput = document.querySelector(`input.date-input[data-week="2"][data-day="${i}"]`);
            if (dateInput) {
                dateInput.value = '';
            }
        }
        return;
    }

    const startDate = new Date(period.start);

    // Fill Week 1 (days 0-6)
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dateInput = document.querySelector(`input.date-input[data-week="1"][data-day="${i}"]`);
        if (dateInput) {
            dateInput.value = formatDateForInput(date);
        }
    }

    // Fill Week 2 (days 7-13)
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + 7 + i); // Start from day 7

        const dateInput = document.querySelector(`input.date-input[data-week="2"][data-day="${i}"]`);
        if (dateInput) {
            dateInput.value = formatDateForInput(date);
        }
    }
}

// Create HTML for a single time entry pair
function createTimeEntryHTML(week, day, pairIndex) {
    return `
        <div class="time-entry-pair" data-week="${week}" data-day="${day}" data-pair="${pairIndex}">
            <input type="time" class="time-start" placeholder="Start" data-week="${week}" data-day="${day}" data-pair="${pairIndex}">
            <span class="time-separator">-</span>
            <input type="time" class="time-stop" placeholder="Stop" data-week="${week}" data-day="${day}" data-pair="${pairIndex}">
            <button class="remove-time-btn" data-week="${week}" data-day="${day}" data-pair="${pairIndex}" ${pairIndex === 0 ? 'style="display:none;"' : ''}>×</button>
        </div>
    `;
}

// Create HTML for a manual hours entry
function createHoursEntryHTML(week, day, hoursIndex) {
    return `
        <div class="hours-entry" data-week="${week}" data-day="${day}" data-hours-index="${hoursIndex}">
            <input type="number" class="hours-amount" placeholder="Hours" step="0.25" min="0" data-week="${week}" data-day="${day}" data-hours-index="${hoursIndex}">
            <input type="text" class="hours-description" placeholder="Description" data-week="${week}" data-day="${day}" data-hours-index="${hoursIndex}">
            <button class="remove-hours-btn" data-week="${week}" data-day="${day}" data-hours-index="${hoursIndex}">×</button>
        </div>
    `;
}

// Add a new time pair
function addTimePair(week, day) {
    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    const currentPairs = container.querySelectorAll('.time-entry-pair');
    const newPairIndex = currentPairs.length;

    const newPairHTML = createTimeEntryHTML(week, day, newPairIndex);
    container.insertAdjacentHTML('beforeend', newPairHTML);

    // Set up event listeners for the new pair
    setupTimeEntryListeners(week, day, newPairIndex);

    // Auto-save
    autoSave();
}

// Remove a time pair
function removeTimePair(week, day, pairIndex) {
    const pair = document.querySelector(`.time-entry-pair[data-week="${week}"][data-day="${day}"][data-pair="${pairIndex}"]`);
    if (pair) {
        pair.remove();
        calculateDayTotal(week, day);
        autoSave();
    }
}

// Add a new hours entry
function addHoursEntry(week, day) {
    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    const currentEntries = container.querySelectorAll('.hours-entry');
    const newIndex = currentEntries.length;

    const newEntryHTML = createHoursEntryHTML(week, day, newIndex);
    container.insertAdjacentHTML('beforeend', newEntryHTML);

    // Set up event listeners for the new entry
    setupHoursEntryListeners(week, day, newIndex);

    // Auto-save
    autoSave();
}

// Remove a hours entry
function removeHoursEntry(week, day, hoursIndex) {
    const entry = document.querySelector(`.hours-entry[data-week="${week}"][data-day="${day}"][data-hours-index="${hoursIndex}"]`);
    if (entry) {
        entry.remove();
        calculateDayTotal(week, day);
        autoSave();
    }
}

// Calculate total hours for a specific day from all time pairs
// Check if two time ranges overlap
function timesOverlap(start1, end1, start2, end2) {
    // Convert times to minutes for easier comparison
    const toMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);

    // Check if ranges overlap
    return (s1 < e2 && s2 < e1);
}

// Validate time entries for a day to ensure no overlaps
function validateTimeEntries(week, day) {
    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    const pairs = container.querySelectorAll('.time-entry-pair');

    const timeRanges = [];

    // Collect all time ranges
    pairs.forEach(pair => {
        const startInput = pair.querySelector('.time-start');
        const stopInput = pair.querySelector('.time-stop');

        if (startInput.value && stopInput.value) {
            timeRanges.push({
                start: startInput.value,
                end: stopInput.value,
                startElement: startInput,
                endElement: stopInput
            });
        }
    });

    // Check for overlaps
    for (let i = 0; i < timeRanges.length; i++) {
        for (let j = i + 1; j < timeRanges.length; j++) {
            if (timesOverlap(timeRanges[i].start, timeRanges[i].end,
                           timeRanges[j].start, timeRanges[j].end)) {
                // Highlight overlapping entries
                timeRanges[i].startElement.style.backgroundColor = '#ffcccc';
                timeRanges[i].endElement.style.backgroundColor = '#ffcccc';
                timeRanges[j].startElement.style.backgroundColor = '#ffcccc';
                timeRanges[j].endElement.style.backgroundColor = '#ffcccc';

                return false; // Validation failed
            }
        }
    }

    // Clear any previous error highlighting
    pairs.forEach(pair => {
        pair.querySelector('.time-start').style.backgroundColor = '';
        pair.querySelector('.time-stop').style.backgroundColor = '';
    });

    return true; // Validation passed
}

function calculateDayTotal(week, day) {
    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    const pairs = container.querySelectorAll('.time-entry-pair');
    const hoursEntries = container.querySelectorAll('.hours-entry');

    let totalHours = 0;
    let hasAnyTimes = false;

    // Calculate from time pairs
    pairs.forEach(pair => {
        const startInput = pair.querySelector('.time-start');
        const stopInput = pair.querySelector('.time-stop');

        if (startInput.value && stopInput.value) {
            const hours = calculateHoursFromTimeInputs(startInput.value, stopInput.value);
            totalHours += hours;
            hasAnyTimes = true;
        }
    });

    // Calculate from manual hours entries
    hoursEntries.forEach(entry => {
        const hoursInput = entry.querySelector('.hours-amount');
        if (hoursInput.value) {
            totalHours += parseFloat(hoursInput.value) || 0;
            hasAnyTimes = true;
        }
    });

    const totalInput = document.querySelector(`input.total-input[data-week="${week}"][data-day="${day}"]`);
    if (totalInput) {
        // Show empty string if no times entered, otherwise show the total
        totalInput.value = hasAnyTimes ? totalHours.toFixed(2) : '';
    }

    // Validate time entries for overlaps
    validateTimeEntries(week, day);

    updatePrintDisplay(week, day);
    calculateTotals();
}

// Update the print display for a specific day
function updatePrintDisplay(week, day) {
    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    const printDiv = document.querySelector(`.time-entries-print[data-week="${week}"][data-day="${day}"]`);
    const dayTypeSelect = document.querySelector(`.day-type-select[data-week="${week}"][data-day="${day}"]`);
    const specialDisplay = document.querySelector(`.special-day-display[data-week="${week}"][data-day="${day}"]`);

    if (!printDiv) return;

    const dayType = dayTypeSelect ? dayTypeSelect.value : 'regular';

    if (dayType === 'holiday') {
        printDiv.textContent = 'Holiday';
    } else if (dayType === 'called-off') {
        printDiv.textContent = 'Called off';
    } else if (dayType === 'vacation') {
        printDiv.textContent = 'Vacation/Time Off';
    } else if (dayType === 'office-closed') {
        // Show times + note
        const pairs = container.querySelectorAll('.time-entry-pair');
        const timeRanges = [];

        pairs.forEach(pair => {
            const startInput = pair.querySelector('.time-start');
            const stopInput = pair.querySelector('.time-stop');

            if (startInput.value && stopInput.value) {
                const startFormatted = formatTimeForPrint(startInput.value);
                const stopFormatted = formatTimeForPrint(stopInput.value);
                timeRanges.push(`${startFormatted} - ${stopFormatted}`);
            }
        });

        const timesText = timeRanges.join(' ');
        // Always show the note, even if no times entered
        printDiv.innerHTML = timesText + (timesText ? '<br>' : '') + '*Office closed early';
    } else if (dayType === 'on-call') {
        // Show times + hours entries + "On Call" note
        const pairs = container.querySelectorAll('.time-entry-pair');
        const hoursEntries = container.querySelectorAll('.hours-entry');
        const timeRanges = [];
        const hoursDescriptions = [];

        // Get time ranges
        pairs.forEach(pair => {
            const startInput = pair.querySelector('.time-start');
            const stopInput = pair.querySelector('.time-stop');

            if (startInput.value && stopInput.value) {
                const startFormatted = formatTimeForPrint(startInput.value);
                const stopFormatted = formatTimeForPrint(stopInput.value);
                timeRanges.push(`${startFormatted} - ${stopFormatted}`);
            }
        });

        // Get hours entries with descriptions
        hoursEntries.forEach(entry => {
            const hoursInput = entry.querySelector('.hours-amount');
            const descInput = entry.querySelector('.hours-description');

            if (hoursInput.value) {
                const hours = parseFloat(hoursInput.value) || 0;
                const desc = descInput.value || '';
                if (desc) {
                    hoursDescriptions.push(`${hours}h ${desc}`);
                } else {
                    hoursDescriptions.push(`${hours}h`);
                }
            }
        });

        // Combine times and hours
        const allEntries = [...timeRanges, ...hoursDescriptions];
        const timesText = allEntries.join(' ');
        // Show times with "On Call" note
        printDiv.innerHTML = timesText + (timesText ? '<br>' : '') + 'On Call';
    } else {
        // Regular day
        if (!container) return;

        const pairs = container.querySelectorAll('.time-entry-pair');
        const hoursEntries = container.querySelectorAll('.hours-entry');
        const timeRanges = [];
        const hoursDescriptions = [];

        // Get time ranges
        pairs.forEach(pair => {
            const startInput = pair.querySelector('.time-start');
            const stopInput = pair.querySelector('.time-stop');

            if (startInput.value && stopInput.value) {
                const startFormatted = formatTimeForPrint(startInput.value);
                const stopFormatted = formatTimeForPrint(stopInput.value);
                timeRanges.push(`${startFormatted} - ${stopFormatted}`);
            }
        });

        // Get hours entries with descriptions
        hoursEntries.forEach(entry => {
            const hoursInput = entry.querySelector('.hours-amount');
            const descInput = entry.querySelector('.hours-description');

            if (hoursInput.value) {
                const hours = parseFloat(hoursInput.value) || 0;
                const desc = descInput.value || '';
                if (desc) {
                    hoursDescriptions.push(`${hours}h ${desc}`);
                } else {
                    hoursDescriptions.push(`${hours}h`);
                }
            }
        });

        // Combine times and hours
        const allEntries = [...timeRanges, ...hoursDescriptions];
        printDiv.textContent = allEntries.join(' ');
    }
}

// Format time from HH:MM to h:mm AM/PM
function formatTimeForPrint(time24) {
    if (!time24) return '';

    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${hours12}:${String(minutes).padStart(2, '0')}${period}`;
}

// Calculate hours from HTML5 time inputs (HH:MM format)
function calculateHoursFromTimeInputs(startTime, stopTime) {
    if (!startTime || !stopTime) return 0;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [stopHour, stopMin] = stopTime.split(':').map(Number);

    const startDecimal = startHour + startMin / 60;
    const stopDecimal = stopHour + stopMin / 60;

    let diff = stopDecimal - startDecimal;
    if (diff < 0) diff += 24; // Handle overnight shifts

    return Math.round(diff * 4) / 4; // Round to nearest 0.25
}

// Set up event listeners for time entry inputs
function setupTimeEntryListeners(week, day, pairIndex) {
    const pair = document.querySelector(`.time-entry-pair[data-week="${week}"][data-day="${day}"][data-pair="${pairIndex}"]`);
    if (!pair) return;

    const startInput = pair.querySelector('.time-start');
    const stopInput = pair.querySelector('.time-stop');
    const removeBtn = pair.querySelector('.remove-time-btn');

    if (startInput) {
        startInput.addEventListener('change', () => {
            calculateDayTotal(week, day);
            autoSave();
            updateClockButtonStates();
        });
    }

    if (stopInput) {
        stopInput.addEventListener('change', () => {
            calculateDayTotal(week, day);
            autoSave();
            updateClockButtonStates();
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeTimePair(week, day, pairIndex);
            updateClockButtonStates();
        });
    }
}

// Set up event listeners for hours entry inputs
function setupHoursEntryListeners(week, day, hoursIndex) {
    const entry = document.querySelector(`.hours-entry[data-week="${week}"][data-day="${day}"][data-hours-index="${hoursIndex}"]`);
    if (!entry) return;

    const hoursInput = entry.querySelector('.hours-amount');
    const descInput = entry.querySelector('.hours-description');
    const removeBtn = entry.querySelector('.remove-hours-btn');

    if (hoursInput) {
        hoursInput.addEventListener('input', () => {
            calculateDayTotal(week, day);
            autoSave();
        });
    }

    if (descInput) {
        descInput.addEventListener('input', () => {
            updatePrintDisplay(week, day);
            autoSave();
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeHoursEntry(week, day, hoursIndex);
        });
    }
}

// Create all rows in the single table
function createTimecardTable() {
    const tbody = document.getElementById('timecardBody');
    tbody.innerHTML = '';

    // Week 1 - 7 rows
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="date-input" data-week="1" data-day="${i}" readonly></td>
            <td class="time-entries-cell">
                <select class="day-type-select" data-week="1" data-day="${i}">
                    <option value="regular">Regular</option>
                    <option value="on-call">On Call</option>
                    <option value="holiday">Holiday</option>
                    <option value="called-off">Called Off</option>
                    <option value="office-closed">Office Closed Early</option>
                    <option value="vacation">Vacation/Time Off</option>
                </select>
                <div class="time-entries-container" data-week="1" data-day="${i}">
                    ${createTimeEntryHTML(1, i, 0)}
                </div>
                <div class="button-row">
                    <button class="add-time-btn" data-week="1" data-day="${i}">+ Add Time</button>
                    <button class="add-hours-btn" data-week="1" data-day="${i}" style="display:none;">Add Hours</button>
                </div>
                <div class="special-day-display" data-week="1" data-day="${i}" style="display:none;"></div>
                <div class="time-entries-print" data-week="1" data-day="${i}"></div>
            </td>
            <td><input type="number" class="total-input" data-week="1" data-day="${i}" step="0.25" min="0" value="" readonly></td>
        `;
        tbody.appendChild(tr);

        if (!timesheetData.week1[i]) {
            timesheetData.week1[i] = { date: '', dayType: 'regular', timePairs: [{ start: '', stop: '' }], total: 0 };
        }
    }

    // Week 1 Total row
    const week1TotalRow = document.createElement('tr');
    week1TotalRow.className = 'total-row';
    week1TotalRow.innerHTML = `
        <td colspan="2">Week 1 Total</td>
        <td class="total-value"><span id="week1Total">0</span></td>
    `;
    tbody.appendChild(week1TotalRow);

    // Week 2 - 7 rows
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="date-input" data-week="2" data-day="${i}" readonly></td>
            <td class="time-entries-cell">
                <select class="day-type-select" data-week="2" data-day="${i}">
                    <option value="regular">Regular</option>
                    <option value="on-call">On Call</option>
                    <option value="holiday">Holiday</option>
                    <option value="called-off">Called Off</option>
                    <option value="office-closed">Office Closed Early</option>
                    <option value="vacation">Vacation/Time Off</option>
                </select>
                <div class="time-entries-container" data-week="2" data-day="${i}">
                    ${createTimeEntryHTML(2, i, 0)}
                </div>
                <div class="button-row">
                    <button class="add-time-btn" data-week="2" data-day="${i}">+ Add Time</button>
                    <button class="add-hours-btn" data-week="2" data-day="${i}" style="display:none;">Add Hours</button>
                </div>
                <div class="special-day-display" data-week="2" data-day="${i}" style="display:none;"></div>
                <div class="time-entries-print" data-week="2" data-day="${i}"></div>
            </td>
            <td><input type="number" class="total-input" data-week="2" data-day="${i}" step="0.25" min="0" value="" readonly></td>
        `;
        tbody.appendChild(tr);

        if (!timesheetData.week2[i]) {
            timesheetData.week2[i] = { date: '', dayType: 'regular', timePairs: [{ start: '', stop: '' }], total: 0 };
        }
    }

    // Week 2 Total row
    const week2TotalRow = document.createElement('tr');
    week2TotalRow.className = 'total-row';
    week2TotalRow.innerHTML = `
        <td colspan="2">Week 2 Total</td>
        <td class="total-value"><span id="week2Total">0</span></td>
    `;
    tbody.appendChild(week2TotalRow);

    // Total Hours for 2 Weeks row
    const totalHoursRow = document.createElement('tr');
    totalHoursRow.className = 'summary-row';
    totalHoursRow.innerHTML = `
        <td colspan="2">Total Hours for 2 Weeks</td>
        <td class="summary-value"><span id="totalHours">0</span></td>
    `;
    tbody.appendChild(totalHoursRow);

    // Overtime row
    const overtimeRow = document.createElement('tr');
    overtimeRow.className = 'summary-row';
    overtimeRow.innerHTML = `
        <td colspan="2">Overtime</td>
        <td class="summary-value"><span id="overtime"></span></td>
    `;
    tbody.appendChild(overtimeRow);

    // Personal Leave row
    const personalLeaveRow = document.createElement('tr');
    personalLeaveRow.className = 'summary-row';
    personalLeaveRow.innerHTML = `
        <td colspan="2">Personal Leave</td>
        <td class="summary-value"><input type="number" id="personalLeave" step="0.25" min="0" value="0" style="width: 60px; text-align: center; border: none; font-weight: bold; font-size: 13px; font-family: 'Times New Roman', Times, serif;"></td>
    `;
    tbody.appendChild(personalLeaveRow);
}

// Calculate time difference from time range
function calculateHoursFromRange(timeRange) {
    if (!timeRange || !timeRange.includes('-')) return 0;

    try {
        const parts = timeRange.split('-').map(p => p.trim());
        if (parts.length !== 2) return 0;

        const parseTime = (timeStr) => {
            const isPM = timeStr.toLowerCase().includes('pm');
            const isAM = timeStr.toLowerCase().includes('am');
            let [hours, minutes] = timeStr.replace(/[^\d:]/g, '').split(':').map(Number);

            if (!minutes) minutes = 0;

            if (isPM && hours !== 12) hours += 12;
            if (isAM && hours === 12) hours = 0;

            return hours + minutes / 60;
        };

        const startTime = parseTime(parts[0]);
        const endTime = parseTime(parts[1]);

        let diff = endTime - startTime;
        if (diff < 0) diff += 24; // Handle overnight shifts

        return Math.round(diff * 4) / 4; // Round to nearest 0.25
    } catch (e) {
        return 0;
    }
}

// Calculate totals
async function calculateTotals() {
    let week1Total = 0;
    let week2Total = 0;
    let week1HolidayHours = 0;
    let week2HolidayHours = 0;

    // Calculate week 1
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
        const totalInput = document.querySelector(`input.total-input[data-week="1"][data-day="${day}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="1"][data-day="${day}"]`);

        if (totalInput) {
            const value = parseFloat(totalInput.value) || 0;
            week1Total += value;

            // Track holiday hours separately (don't count toward overtime)
            if (dayTypeSelect && dayTypeSelect.value === 'holiday') {
                week1HolidayHours += value;
            }
        }
    }

    // Calculate week 2
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
        const totalInput = document.querySelector(`input.total-input[data-week="2"][data-day="${day}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="2"][data-day="${day}"]`);

        if (totalInput) {
            const value = parseFloat(totalInput.value) || 0;
            week2Total += value;

            // Track holiday hours separately (don't count toward overtime)
            if (dayTypeSelect && dayTypeSelect.value === 'holiday') {
                week2HolidayHours += value;
            }
        }
    }

    // Check if salary mode is enabled
    let salaryMode = false;
    if (typeof window.electronAPI !== 'undefined') {
        try {
            const result = await window.electronAPI.loadSettings();
            if (result.success && result.settings) {
                salaryMode = result.settings.salaryMode || false;
            }
        } catch (error) {
            console.error('Error loading settings for salary mode:', error);
        }
    }

    let totalHours, totalOvertime;

    if (salaryMode) {
        // Salary mode: Just add all hours together
        totalHours = week1Total + week2Total;
        totalOvertime = 0;
    } else {
        // Regular mode: Calculate regular (non-holiday) hours for each week
        const week1RegularHours = week1Total - week1HolidayHours;
        const week2RegularHours = week2Total - week2HolidayHours;

        // Calculate overtime (any hours over 40 per week, excluding holiday hours)
        const week1Overtime = Math.max(0, week1RegularHours - REGULAR_HOURS_PER_WEEK);
        const week2Overtime = Math.max(0, week2RegularHours - REGULAR_HOURS_PER_WEEK);
        totalOvertime = week1Overtime + week2Overtime;

        // Total Hours for 2 Weeks = holiday hours + non-overtime regular hours
        // Week 1: holiday hours + min(regular hours, 40)
        // Week 2: holiday hours + min(regular hours, 40)
        const week1NonOvertimeRegular = Math.min(week1RegularHours, REGULAR_HOURS_PER_WEEK);
        const week2NonOvertimeRegular = Math.min(week2RegularHours, REGULAR_HOURS_PER_WEEK);
        totalHours = week1HolidayHours + week1NonOvertimeRegular + week2HolidayHours + week2NonOvertimeRegular;
    }

    // Update display
    document.getElementById('week1Total').textContent = week1Total.toFixed(2);
    document.getElementById('week2Total').textContent = week2Total.toFixed(2);
    document.getElementById('totalHours').textContent = totalHours.toFixed(2);
    document.getElementById('overtime').textContent = totalOvertime.toFixed(2);
}

// Auto-save functionality
let autoSaveTimeout = null;
async function autoSave() {
    // Debounce: wait 1 second after last change before saving
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(async () => {
        saveTimesheetData();

        if (typeof window.electronAPI !== 'undefined' && timesheetData.payPeriod) {
            try {
                await window.electronAPI.autoSaveTimesheet(timesheetData);
                console.log('Auto-saved timesheet');
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    }, 1000); // Wait 1 second after last change
}

// Handle day type change
function handleDayTypeChange(week, day, dayType) {
    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    const addBtn = document.querySelector(`.add-time-btn[data-week="${week}"][data-day="${day}"]`);
    const specialDisplay = document.querySelector(`.special-day-display[data-week="${week}"][data-day="${day}"]`);
    const totalInput = document.querySelector(`input.total-input[data-week="${week}"][data-day="${day}"]`);

    if (dayType === 'regular') {
        // Show normal time entry
        container.style.display = '';
        addBtn.style.display = '';
        specialDisplay.style.display = 'none';
        specialDisplay.innerHTML = '';
        // Recalculate based on time entries
        calculateDayTotal(week, day);
    } else if (dayType === 'on-call') {
        // Show time entry, add "On Call" note below
        container.style.display = '';
        addBtn.style.display = '';
        specialDisplay.style.display = 'block';
        specialDisplay.innerHTML = '<span class="on-call-note">On Call</span>';
        // Recalculate based on time entries
        calculateDayTotal(week, day);
    } else if (dayType === 'holiday') {
        // Hide time entry, show "Holiday", set 8 hours
        container.style.display = 'none';
        addBtn.style.display = 'none';
        specialDisplay.style.display = 'block';
        specialDisplay.innerHTML = '<span class="holiday-text">Holiday</span>';
        totalInput.value = '8.00';
        updatePrintDisplay(week, day);
        calculateTotals();
    } else if (dayType === 'called-off') {
        // Hide time entry, show "Called off", set 0 hours
        container.style.display = 'none';
        addBtn.style.display = 'none';
        specialDisplay.style.display = 'block';
        specialDisplay.innerHTML = '<span class="called-off-text">Called off</span>';
        totalInput.value = '0.00';
        updatePrintDisplay(week, day);
        calculateTotals();
    } else if (dayType === 'vacation') {
        // Hide time entry, show "Vacation/Time Off", set 0 hours
        container.style.display = 'none';
        addBtn.style.display = 'none';
        specialDisplay.style.display = 'block';
        specialDisplay.innerHTML = '<span class="vacation-text">Vacation/Time Off</span>';
        totalInput.value = '0.00';
        updatePrintDisplay(week, day);
        calculateTotals();
    } else if (dayType === 'office-closed') {
        // Show time entry, add note below, set 8 hours
        container.style.display = '';
        addBtn.style.display = '';
        specialDisplay.style.display = 'block';
        specialDisplay.innerHTML = '<span class="office-closed-note">*Office closed early</span>';
        totalInput.value = '8.00';
        updatePrintDisplay(week, day);
        calculateTotals();
    }

    autoSave();
}

// Set up event listeners for all time entries and buttons
function setupAutoCalculate() {
    // Set up listeners for all existing time entry pairs
    for (let week = 1; week <= 2; week++) {
        for (let day = 0; day < DAYS_PER_WEEK; day++) {
            const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
            if (container) {
                const pairs = container.querySelectorAll('.time-entry-pair');
                pairs.forEach((pair, pairIndex) => {
                    setupTimeEntryListeners(week, day, pairIndex);
                });
            }
        }
    }

    // Set up add-time button listeners
    document.querySelectorAll('.add-time-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const week = this.getAttribute('data-week');
            const day = this.getAttribute('data-day');
            addTimePair(week, day);
        });
    });

    // Set up add-hours button listeners
    document.querySelectorAll('.add-hours-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const week = this.getAttribute('data-week');
            const day = this.getAttribute('data-day');
            addHoursEntry(week, day);
        });
    });

    // Set up day type dropdown listeners
    document.querySelectorAll('.day-type-select').forEach(select => {
        select.addEventListener('change', function() {
            const week = this.getAttribute('data-week');
            const day = this.getAttribute('data-day');
            const dayType = this.value;
            handleDayTypeChange(week, day, dayType);
        });
    });

    // Personal leave and employee name listeners
    document.getElementById('personalLeave').addEventListener('input', function() {
        timesheetData.personalLeave = parseFloat(this.value) || 0;
        autoSave();
    });

    document.getElementById('employeeName').addEventListener('input', function() {
        // Employee name is now saved via settings window, just trigger auto-save for timesheet
        autoSave();
    });
}

// Save timesheet data
function saveTimesheetData() {
    timesheetData.employeeName = document.getElementById('employeeName').value;

    // Save week 1 data
    timesheetData.week1 = [];
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
        const dateInput = document.querySelector(`input.date-input[data-week="1"][data-day="${day}"]`);
        const totalInput = document.querySelector(`input.total-input[data-week="1"][data-day="${day}"]`);
        const container = document.querySelector(`.time-entries-container[data-week="1"][data-day="${day}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="1"][data-day="${day}"]`);

        const timePairs = [];
        const hoursEntries = [];
        if (container) {
            container.querySelectorAll('.time-entry-pair').forEach(pair => {
                const startInput = pair.querySelector('.time-start');
                const stopInput = pair.querySelector('.time-stop');
                timePairs.push({
                    start: startInput.value || '',
                    stop: stopInput.value || ''
                });
            });

            container.querySelectorAll('.hours-entry').forEach(entry => {
                const hoursInput = entry.querySelector('.hours-amount');
                const descInput = entry.querySelector('.hours-description');
                hoursEntries.push({
                    hours: hoursInput.value || '',
                    description: descInput.value || ''
                });
            });
        }

        timesheetData.week1[day] = {
            date: dateInput ? dateInput.value : '',
            dayType: dayTypeSelect ? dayTypeSelect.value : 'regular',
            timePairs: timePairs,
            hoursEntries: hoursEntries,
            total: totalInput ? parseFloat(totalInput.value) || 0 : 0
        };
    }

    // Save week 2 data
    timesheetData.week2 = [];
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
        const dateInput = document.querySelector(`input.date-input[data-week="2"][data-day="${day}"]`);
        const totalInput = document.querySelector(`input.total-input[data-week="2"][data-day="${day}"]`);
        const container = document.querySelector(`.time-entries-container[data-week="2"][data-day="${day}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="2"][data-day="${day}"]`);

        const timePairs = [];
        const hoursEntries = [];
        if (container) {
            container.querySelectorAll('.time-entry-pair').forEach(pair => {
                const startInput = pair.querySelector('.time-start');
                const stopInput = pair.querySelector('.time-stop');
                timePairs.push({
                    start: startInput.value || '',
                    stop: stopInput.value || ''
                });
            });

            container.querySelectorAll('.hours-entry').forEach(entry => {
                const hoursInput = entry.querySelector('.hours-amount');
                const descInput = entry.querySelector('.hours-description');
                hoursEntries.push({
                    hours: hoursInput.value || '',
                    description: descInput.value || ''
                });
            });
        }

        timesheetData.week2[day] = {
            date: dateInput ? dateInput.value : '',
            dayType: dayTypeSelect ? dayTypeSelect.value : 'regular',
            timePairs: timePairs,
            hoursEntries: hoursEntries,
            total: totalInput ? parseFloat(totalInput.value) || 0 : 0
        };
    }

    timesheetData.personalLeave = parseFloat(document.getElementById('personalLeave').value) || 0;

    // Store the selected pay period label (for filename)
    const payPeriodDisplay = document.getElementById('payPeriodDisplay').value;
    timesheetData.payPeriod = payPeriodDisplay || '';
}

// Load timesheet data
function loadTimesheetData(data) {
    timesheetData = data;

    document.getElementById('employeeName').value = data.employeeName || '';
    document.getElementById('personalLeave').value = data.personalLeave || 0;

    // Ensure week1 and week2 exist
    if (!data.week1 || !Array.isArray(data.week1)) {
        data.week1 = [];
    }
    if (!data.week2 || !Array.isArray(data.week2)) {
        data.week2 = [];
    }

    // Load week 1
    data.week1.forEach((day, dayIndex) => {
        const dateInput = document.querySelector(`input.date-input[data-week="1"][data-day="${dayIndex}"]`);
        const totalInput = document.querySelector(`input.total-input[data-week="1"][data-day="${dayIndex}"]`);
        const container = document.querySelector(`.time-entries-container[data-week="1"][data-day="${dayIndex}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="1"][data-day="${dayIndex}"]`);

        if (dateInput) dateInput.value = day.date || '';
        if (totalInput) totalInput.value = day.total || 0;

        // Set day type
        if (dayTypeSelect) {
            dayTypeSelect.value = day.dayType || 'regular';
        }

        // Clear existing time pairs and hours entries, load new ones
        if (container) {
            container.innerHTML = '';

            // Load time pairs
            if (day.timePairs) {
                day.timePairs.forEach((pair, pairIndex) => {
                    container.insertAdjacentHTML('beforeend', createTimeEntryHTML(1, dayIndex, pairIndex));
                    const pairElement = container.querySelector(`.time-entry-pair[data-pair="${pairIndex}"]`);
                    if (pairElement) {
                        const startInput = pairElement.querySelector('.time-start');
                        const stopInput = pairElement.querySelector('.time-stop');
                        if (startInput) startInput.value = pair.start || '';
                        if (stopInput) stopInput.value = pair.stop || '';
                    }
                    setupTimeEntryListeners(1, dayIndex, pairIndex);
                });
            }

            // Load hours entries
            if (day.hoursEntries) {
                day.hoursEntries.forEach((entry, entryIndex) => {
                    container.insertAdjacentHTML('beforeend', createHoursEntryHTML(1, dayIndex, entryIndex));
                    const entryElement = container.querySelector(`.hours-entry[data-hours-index="${entryIndex}"]`);
                    if (entryElement) {
                        const hoursInput = entryElement.querySelector('.hours-amount');
                        const descInput = entryElement.querySelector('.hours-description');
                        if (hoursInput) hoursInput.value = entry.hours || '';
                        if (descInput) descInput.value = entry.description || '';
                    }
                    setupHoursEntryListeners(1, dayIndex, entryIndex);
                });
            }
        }

        // Apply day type display
        handleDayTypeChange(1, dayIndex, day.dayType || 'regular');
    });

    // Load week 2
    data.week2.forEach((day, dayIndex) => {
        const dateInput = document.querySelector(`input.date-input[data-week="2"][data-day="${dayIndex}"]`);
        const totalInput = document.querySelector(`input.total-input[data-week="2"][data-day="${dayIndex}"]`);
        const container = document.querySelector(`.time-entries-container[data-week="2"][data-day="${dayIndex}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="2"][data-day="${dayIndex}"]`);

        if (dateInput) dateInput.value = day.date || '';
        if (totalInput) totalInput.value = day.total || 0;

        // Set day type
        if (dayTypeSelect) {
            dayTypeSelect.value = day.dayType || 'regular';
        }

        // Clear existing time pairs and hours entries, load new ones
        if (container) {
            container.innerHTML = '';

            // Load time pairs
            if (day.timePairs) {
                day.timePairs.forEach((pair, pairIndex) => {
                    container.insertAdjacentHTML('beforeend', createTimeEntryHTML(2, dayIndex, pairIndex));
                    const pairElement = container.querySelector(`.time-entry-pair[data-pair="${pairIndex}"]`);
                    if (pairElement) {
                        const startInput = pairElement.querySelector('.time-start');
                        const stopInput = pairElement.querySelector('.time-stop');
                        if (startInput) startInput.value = pair.start || '';
                        if (stopInput) stopInput.value = pair.stop || '';
                    }
                    setupTimeEntryListeners(2, dayIndex, pairIndex);
                });
            }

            // Load hours entries
            if (day.hoursEntries) {
                day.hoursEntries.forEach((entry, entryIndex) => {
                    container.insertAdjacentHTML('beforeend', createHoursEntryHTML(2, dayIndex, entryIndex));
                    const entryElement = container.querySelector(`.hours-entry[data-hours-index="${entryIndex}"]`);
                    if (entryElement) {
                        const hoursInput = entryElement.querySelector('.hours-amount');
                        const descInput = entryElement.querySelector('.hours-description');
                        if (hoursInput) hoursInput.value = entry.hours || '';
                        if (descInput) descInput.value = entry.description || '';
                    }
                    setupHoursEntryListeners(2, dayIndex, entryIndex);
                });
            }
        }

        // Apply day type display
        handleDayTypeChange(2, dayIndex, day.dayType || 'regular');
    });

    calculateTotals();
}

// Pay Period selector event handler
document.getElementById('payPeriodSelector').addEventListener('change', async function() {
    const selectedValue = this.value;
    const selectedOption = this.options[this.selectedIndex];

    if (selectedValue) {
        // Check if this is the current pay period
        const period = JSON.parse(selectedValue);
        isCurrentPayPeriod = period.isCurrent || false;

        // Update print display field (without "(Current)")
        const cleanLabel = selectedOption.getAttribute('data-label');
        document.getElementById('payPeriodDisplay').value = cleanLabel || '';

        // Fill in the dates
        fillDatesForPayPeriod(selectedValue);

        // Try to auto-load saved timesheet for this pay period
        await tryAutoLoadTimesheet(cleanLabel);

        // Update clock button states
        updateClockButtonStates();
    }
});

// Check if a timesheet is essentially blank (only has employee name/dates)
function isTimesheetBlank(data) {
    if (!data) return true;

    // Check if week1 and week2 have any actual time entries
    const hasWeek1Data = data.week1 && data.week1.some(day => {
        if (!day) return false;
        // Check if there are time pairs with actual times
        if (day.timePairs && day.timePairs.some(pair => pair.start || pair.stop)) {
            return true;
        }
        // Check if day type is not regular (holiday, vacation, etc.)
        if (day.dayType && day.dayType !== 'regular') {
            return true;
        }
        return false;
    });

    const hasWeek2Data = data.week2 && data.week2.some(day => {
        if (!day) return false;
        // Check if there are time pairs with actual times
        if (day.timePairs && day.timePairs.some(pair => pair.start || pair.stop)) {
            return true;
        }
        // Check if day type is not regular (holiday, vacation, etc.)
        if (day.dayType && day.dayType !== 'regular') {
            return true;
        }
        return false;
    });

    // Check if personal leave has a value
    const hasPersonalLeave = data.personalLeave && data.personalLeave > 0;

    // Timesheet is blank if it has no week data and no personal leave
    return !hasWeek1Data && !hasWeek2Data && !hasPersonalLeave;
}

// Try to auto-load a saved timesheet for the selected pay period
async function tryAutoLoadTimesheet(payPeriodLabel) {
    if (!payPeriodLabel) return;

    // Check if we're in electron environment
    if (typeof window.electronAPI === 'undefined') return;

    try {
        const result = await window.electronAPI.checkTimesheetExists(payPeriodLabel);

        if (result.exists) {
            // Check if the saved timesheet is essentially blank
            if (isTimesheetBlank(result.data)) {
                // Timesheet exists but is blank, try auto-fill from template
                await tryAutoFillFromTemplate(payPeriodLabel);
            } else {
                // Found a saved timesheet with data! Load it
                loadTimesheetData(result.data);
            }
        } else {
            // No saved timesheet, check if we should auto-fill from template
            await tryAutoFillFromTemplate(payPeriodLabel);
        }
    } catch (error) {
        console.error('Error checking for saved timesheet:', error);
        clearTimesheetHours();
    }
}

// Try to auto-fill from template if the setting is enabled
async function tryAutoFillFromTemplate(payPeriodLabel) {
    // Don't auto-fill the template itself
    if (payPeriodLabel === 'Template') {
        clearTimesheetHours();
        return;
    }

    if (typeof window.electronAPI === 'undefined') {
        clearTimesheetHours();
        return;
    }

    try {
        // Load settings to check if auto-fill is enabled
        const settingsResult = await window.electronAPI.loadSettings();

        if (!settingsResult.success || !settingsResult.settings.autoFillFromTemplate) {
            // Auto-fill is disabled, just clear
            clearTimesheetHours();
            return;
        }

        // Check if template exists
        const templateResult = await window.electronAPI.checkTimesheetExists('Template');

        if (!templateResult.exists) {
            // No template found, just clear
            clearTimesheetHours();
            return;
        }

        // Load the template data but keep the current dates
        const templateData = templateResult.data;

        // Store current date values
        const currentDates = {};
        for (let week = 1; week <= 2; week++) {
            for (let day = 0; day < DAYS_PER_WEEK; day++) {
                const dateInput = document.querySelector(`input.date-input[data-week="${week}"][data-day="${day}"]`);
                if (dateInput) {
                    currentDates[`${week}-${day}`] = dateInput.value;
                }
            }
        }

        // Load template data
        loadTimesheetData(templateData);

        // Restore the dates
        for (let week = 1; week <= 2; week++) {
            for (let day = 0; day < DAYS_PER_WEEK; day++) {
                const dateInput = document.querySelector(`input.date-input[data-week="${week}"][data-day="${day}"]`);
                if (dateInput && currentDates[`${week}-${day}`]) {
                    dateInput.value = currentDates[`${week}-${day}`];
                }
            }
        }

        // Update the pay period to the selected one (not Template)
        timesheetData.payPeriod = payPeriodLabel;
        document.getElementById('payPeriodDisplay').value = payPeriodLabel;
    } catch (error) {
        console.error('Error auto-filling from template:', error);
        clearTimesheetHours();
    }
}

// Clear only the hours and totals, keep the dates, reset to defaults
function clearTimesheetHours() {
    // Clear Week 1
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
        const container = document.querySelector(`.time-entries-container[data-week="1"][data-day="${i}"]`);
        const totalInput = document.querySelector(`input.total-input[data-week="1"][data-day="${i}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="1"][data-day="${i}"]`);

        // Reset day type to regular
        if (dayTypeSelect) {
            dayTypeSelect.value = 'regular';
        }

        // Clear all time pairs and reset to single empty pair
        if (container) {
            container.innerHTML = createTimeEntryHTML(1, i, 0);
            setupTimeEntryListeners(1, i, 0);
        }

        // Reset total to empty
        if (totalInput) totalInput.value = '';

        // Apply regular day type display
        handleDayTypeChange(1, i, 'regular');
    }

    // Clear Week 2
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
        const container = document.querySelector(`.time-entries-container[data-week="2"][data-day="${i}"]`);
        const totalInput = document.querySelector(`input.total-input[data-week="2"][data-day="${i}"]`);
        const dayTypeSelect = document.querySelector(`.day-type-select[data-week="2"][data-day="${i}"]`);

        // Reset day type to regular
        if (dayTypeSelect) {
            dayTypeSelect.value = 'regular';
        }

        // Clear all time pairs and reset to single empty pair
        if (container) {
            container.innerHTML = createTimeEntryHTML(2, i, 0);
            setupTimeEntryListeners(2, i, 0);
        }

        // Reset total to empty
        if (totalInput) totalInput.value = '';

        // Apply regular day type display
        handleDayTypeChange(2, i, 'regular');
    }

    // Clear personal leave
    document.getElementById('personalLeave').value = 0;

    // Don't clear employee name - it should persist across pay periods

    // Recalculate totals
    calculateTotals();
}

// Round time to nearest 15-minute increment
function roundToNearest15Minutes(date) {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;

    const newDate = new Date(date);
    newDate.setMinutes(roundedMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);

    return newDate;
}

// Get current day index (0-6 for week 1, 7-13 for week 2)
function getCurrentDayIndex() {
    const today = new Date();
    const selector = document.getElementById('payPeriodSelector');
    const selectedValue = selector.value;

    if (!selectedValue) return null;

    const period = JSON.parse(selectedValue);
    const periodStart = new Date(period.start);

    // Calculate days from period start
    const diffTime = today.getTime() - periodStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Return null if not within the current pay period
    if (diffDays < 0 || diffDays > 13) return null;

    return diffDays;
}

// Check if currently clocked in
function isClockedIn() {
    const dayIndex = getCurrentDayIndex();
    if (dayIndex === null) return false;

    const week = dayIndex < 7 ? 1 : 2;
    const day = dayIndex < 7 ? dayIndex : dayIndex - 7;

    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    if (!container) return false;

    const pairs = container.querySelectorAll('.time-entry-pair');

    // Check if any pair has a start time but no stop time
    for (let pair of pairs) {
        const startInput = pair.querySelector('.time-start');
        const stopInput = pair.querySelector('.time-stop');

        if (startInput.value && !stopInput.value) {
            return true;
        }
    }

    return false;
}

// Update clock button states
function updateClockButtonStates() {
    const clockInBtn = document.getElementById('clockInBtn');
    const clockOutBtn = document.getElementById('clockOutBtn');

    if (!isCurrentPayPeriod) {
        clockInBtn.disabled = true;
        clockOutBtn.disabled = true;
        return;
    }

    const clockedIn = isClockedIn();
    clockInBtn.disabled = clockedIn;
    clockOutBtn.disabled = !clockedIn;
}

// Clock In function
function clockIn() {
    const dayIndex = getCurrentDayIndex();
    if (dayIndex === null) {
        alert('Cannot clock in - not within current pay period');
        return;
    }

    if (isClockedIn()) {
        alert('You are already clocked in!');
        return;
    }

    const week = dayIndex < 7 ? 1 : 2;
    const day = dayIndex < 7 ? dayIndex : dayIndex - 7;

    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    if (!container) return;

    const pairs = container.querySelectorAll('.time-entry-pair');

    // Find the first empty pair or add a new one
    let targetPair = null;
    for (let pair of pairs) {
        const startInput = pair.querySelector('.time-start');
        const stopInput = pair.querySelector('.time-stop');

        if (!startInput.value && !stopInput.value) {
            targetPair = pair;
            break;
        }
    }

    // If no empty pair found, add a new one
    if (!targetPair) {
        addTimePair(week, day);
        const allPairs = container.querySelectorAll('.time-entry-pair');
        targetPair = allPairs[allPairs.length - 1];
    }

    // Set start time to current time rounded to nearest 15 minutes
    const now = new Date();
    const roundedTime = roundToNearest15Minutes(now);
    const hours = String(roundedTime.getHours()).padStart(2, '0');
    const minutes = String(roundedTime.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    const startInput = targetPair.querySelector('.time-start');
    startInput.value = timeString;

    // Trigger change to update totals
    calculateDayTotal(week, day);
    autoSave();
    updateClockButtonStates();
}

// Clock Out function
function clockOut() {
    const dayIndex = getCurrentDayIndex();
    if (dayIndex === null) {
        alert('Cannot clock out - not within current pay period');
        return;
    }

    if (!isClockedIn()) {
        alert('You are not clocked in!');
        return;
    }

    const week = dayIndex < 7 ? 1 : 2;
    const day = dayIndex < 7 ? dayIndex : dayIndex - 7;

    const container = document.querySelector(`.time-entries-container[data-week="${week}"][data-day="${day}"]`);
    if (!container) return;

    const pairs = container.querySelectorAll('.time-entry-pair');

    // Find the pair with start time but no stop time
    for (let pair of pairs) {
        const startInput = pair.querySelector('.time-start');
        const stopInput = pair.querySelector('.time-stop');

        if (startInput.value && !stopInput.value) {
            // Set stop time to current time rounded to nearest 15 minutes
            const now = new Date();
            const roundedTime = roundToNearest15Minutes(now);
            const hours = String(roundedTime.getHours()).padStart(2, '0');
            const minutes = String(roundedTime.getMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}`;

            stopInput.value = timeString;

            // Trigger change to update totals
            calculateDayTotal(week, day);
            autoSave();
            updateClockButtonStates();
            break;
        }
    }
}

// Button handlers
document.getElementById('clockInBtn').addEventListener('click', clockIn);
document.getElementById('clockOutBtn').addEventListener('click', clockOut);


document.getElementById('loadBtn').addEventListener('click', async () => {
    const result = await window.electronAPI.loadTimesheet();
    if (result.success) {
        loadTimesheetData(result.data);
        alert('Timesheet loaded successfully!');
    } else if (!result.canceled) {
        alert('Error loading timesheet: ' + (result.error || 'Unknown error'));
    }
});

document.getElementById('exportPdfBtn').addEventListener('click', async () => {
    saveTimesheetData();

    // Add print class to body to apply print styles
    document.body.classList.add('print-mode');

    // Explicitly hide the salary mode banner during export
    const salaryBanner = document.getElementById('salaryModeBanner');
    const originalBannerDisplay = salaryBanner ? salaryBanner.style.display : null;
    if (salaryBanner) {
        salaryBanner.style.display = 'none';
    }

    try {
        const element = document.getElementById('timesheet');

        // Wait a bit for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
            windowWidth: 794,  // A4 width in pixels at 96 DPI
            windowHeight: 1123 // A4 height in pixels at 96 DPI
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        const pdfData = pdf.output('datauristring');
        const result = await window.electronAPI.exportPDF(pdfData);

        if (result.success) {
            alert('PDF exported successfully!');
        } else if (!result.canceled) {
            alert('Error exporting PDF: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error generating PDF: ' + error.message);
    } finally {
        // Remove print class
        document.body.classList.remove('print-mode');

        // Restore salary mode banner display
        if (salaryBanner && originalBannerDisplay !== null) {
            salaryBanner.style.display = originalBannerDisplay;
        }
    }
});

document.getElementById('printBtn').addEventListener('click', () => {
    window.print();
});

document.getElementById('optionsBtn').addEventListener('click', async () => {
    if (typeof window.electronAPI !== 'undefined') {
        await window.electronAPI.openSettings();
    }
});

// Load employee name from settings
async function loadEmployeeName() {
    if (typeof window.electronAPI !== 'undefined') {
        try {
            const result = await window.electronAPI.loadSettings();
            if (result.success && result.settings) {
                if (result.settings.employeeName) {
                    document.getElementById('employeeName').value = result.settings.employeeName;
                }
            }
        } catch (error) {
            console.error('Error loading employee name:', error);
        }
    }
}

// Update Add Hours button visibility based on settings
async function updateAddHoursButtonVisibility() {
    if (typeof window.electronAPI !== 'undefined') {
        try {
            const result = await window.electronAPI.loadSettings();
            if (result.success && result.settings) {
                const showButtons = result.settings.showAddHoursButton || false;
                document.querySelectorAll('.add-hours-btn').forEach(btn => {
                    btn.style.display = showButtons ? '' : 'none';
                });
            }
        } catch (error) {
            console.error('Error loading settings for Add Hours button:', error);
        }
    }
}

// Update salary mode display
async function updateSalaryModeDisplay() {
    if (typeof window.electronAPI !== 'undefined') {
        try {
            const result = await window.electronAPI.loadSettings();
            if (result.success && result.settings) {
                const salaryMode = result.settings.salaryMode || false;

                // Show/hide salary mode banner
                const banner = document.getElementById('salaryModeBanner');
                if (banner) {
                    banner.style.display = salaryMode ? 'block' : 'none';
                }

                // Show/hide overtime row
                const overtimeRow = document.querySelector('.summary-row:has(#overtime)');
                if (overtimeRow) {
                    overtimeRow.style.display = salaryMode ? 'none' : '';
                }
            }
        } catch (error) {
            console.error('Error loading settings for salary mode:', error);
        }
    }
}

// Listen for settings updates
if (typeof window.electronAPI !== 'undefined') {
    window.electronAPI.onSettingsUpdated((settings) => {
        if (settings.employeeName) {
            document.getElementById('employeeName').value = settings.employeeName;
        }
        // Update Add Hours button visibility
        updateAddHoursButtonVisibility();
        // Update salary mode display
        updateSalaryModeDisplay();
    });
}

// Initialize on load
createTimecardTable();
setupAutoCalculate();
populatePayPeriodDropdown();
calculateTotals();
loadEmployeeName();
updateAddHoursButtonVisibility();
updateSalaryModeDisplay();

// Auto-update functionality
if (typeof window.electronAPI !== 'undefined') {
    const updateNotification = document.getElementById('updateNotification');
    const updateMessage = document.getElementById('updateMessage');
    const downloadUpdateBtn = document.getElementById('downloadUpdateBtn');
    const installUpdateBtn = document.getElementById('installUpdateBtn');
    const laterBtn = document.getElementById('laterBtn');
    const updateProgress = document.getElementById('updateProgress');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');

    // Listen for update available
    window.electronAPI.onUpdateAvailable((info) => {
        console.log('Update available:', info);
        updateMessage.textContent = `A new version (${info.version}) is available. Would you like to download it?`;
        updateNotification.style.display = 'flex';
    });

    // Listen for download progress
    window.electronAPI.onUpdateDownloadProgress((progress) => {
        console.log('Download progress:', progress.percent);
        updateProgress.style.display = 'block';
        progressBarFill.style.width = `${progress.percent}%`;
        progressText.textContent = `Downloading update... ${Math.round(progress.percent)}%`;
    });

    // Listen for update downloaded
    window.electronAPI.onUpdateDownloaded((info) => {
        console.log('Update downloaded:', info);
        updateProgress.style.display = 'none';
        updateMessage.textContent = `Version ${info.version} has been downloaded. Click "Install and Restart" to apply the update.`;
        downloadUpdateBtn.style.display = 'none';
        installUpdateBtn.style.display = 'inline-block';
    });

    // Download update button click
    downloadUpdateBtn.addEventListener('click', async () => {
        downloadUpdateBtn.disabled = true;
        downloadUpdateBtn.textContent = 'Downloading...';
        console.log('Download button clicked, starting download...');
        try {
            const result = await window.electronAPI.downloadUpdate();
            console.log('Download update result:', result);
            if (!result.success) {
                throw new Error(result.error || 'Download failed');
            }
        } catch (error) {
            console.error('Error downloading update:', error);
            downloadUpdateBtn.disabled = false;
            downloadUpdateBtn.textContent = 'Download Update';
            alert('Failed to download update: ' + error.message);
        }
    });

    // Install update button click
    installUpdateBtn.addEventListener('click', async () => {
        await window.electronAPI.installUpdate();
    });

    // Later button click
    laterBtn.addEventListener('click', () => {
        updateNotification.style.display = 'none';
        // Reset UI state
        downloadUpdateBtn.style.display = 'inline-block';
        downloadUpdateBtn.disabled = false;
        downloadUpdateBtn.textContent = 'Download Update';
        installUpdateBtn.style.display = 'none';
        updateProgress.style.display = 'none';
        progressBarFill.style.width = '0%';
    });
}
