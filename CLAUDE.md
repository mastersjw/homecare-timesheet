# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Homecare Timesheet is an Electron-based desktop application for tracking employee time and attendance. The application follows the layout specified in `Time Card (Admin).docx`, featuring a bi-weekly timesheet with automatic overtime calculation.

## Commands

### Development
- `npm start` - Run the application in development mode
- `npm run build` - Build the application for distribution
- `npm run build:win` - Build Windows executable (NSIS installer)

### Installation
- `npm install` - Install all dependencies (run this first)

## Architecture

### Technology Stack
- **Electron**: Desktop application framework
- **Node.js**: Backend runtime
- **HTML/CSS/JavaScript**: Frontend UI
- **jsPDF**: PDF generation library
- **html2canvas**: HTML to canvas conversion for PDF export

### File Structure

#### Main Process (Node.js)
- `main.js` - Electron main process, handles window creation and IPC communication
- `preload.js` - Secure bridge between main and renderer processes

#### Renderer Process (Browser)
- `index.html` - Main UI structure
- `styles.css` - Application styling
- `renderer.js` - Frontend logic, calculations, and event handlers

#### Data Files
- `Time Card (Admin).docx` - Original timesheet template (reference)
- Saved timesheets are stored as `.json` files (user-selected location)

### Key Features

#### Timesheet Layout
- Bi-weekly format (2 weeks × 7 days = 14 rows)
- Fields: Employee Name, Pay Period
- Each day: Date, Hours (from/to), Total hours
- Automatic totals for Week 1, Week 2, and combined total
- Personal Leave tracking

#### Overtime Calculation
- Regular hours: 80 hours per 2-week period
- Overtime = Total Hours - 80 (if positive)
- Calculated automatically in `renderer.js:calculateTotals()`

#### Auto-Calculate Hours
- Enter time range (e.g., "9:00 AM - 5:00 PM") in the "Hours: from/to" field
- On blur, automatically calculates total hours
- Supports 12-hour format with AM/PM
- Rounds to nearest 0.25 hours

#### Save/Load
- Save timesheet data as JSON files via Electron dialog
- Load previously saved timesheets
- IPC handlers in `main.js`: `save-timesheet`, `load-timesheet`

#### Export/Print
- Export to PDF using jsPDF and html2canvas
- Browser print functionality (Ctrl+P)
- Print styles defined in `styles.css` @media print section

### IPC Communication

The application uses Electron's IPC (Inter-Process Communication) for secure file operations:
- `electronAPI.saveTimesheet(data)` - Save JSON file
- `electronAPI.loadTimesheet()` - Load JSON file
- `electronAPI.exportPDF(pdfData)` - Export PDF file

All file dialogs are handled in the main process for security.

### Future Considerations

#### Signature Functionality
- Signature lines are currently static placeholders
- Potential integration with Topaz signature pads would require:
  - Topaz SDK for Node.js/Electron
  - Capture signature as image data
  - Embed signature images in PDF export
  - Store signature data in JSON save files

## Data Model

Timesheet data structure:
```javascript
{
  employeeName: string,
  payPeriod: string,
  week1: [
    { date: string, hours: string, total: number },
    // ... 7 days
  ],
  week2: [
    { date: string, hours: string, total: number },
    // ... 7 days
  ],
  personalLeave: number
}
```
