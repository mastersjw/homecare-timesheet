# Homecare Timesheet Application

A desktop application for tracking employee hours with automatic overtime calculation and bi-weekly timesheet management.

## Features

- **Bi-weekly timesheet tracking** (14 days)
- **Automatic overtime calculation** (over 80 hours per pay period)
- **Auto-save functionality** - timesheets save automatically as you work
- **Template system** - create reusable templates for recurring schedules
- **Multiple time entries per day** - add multiple clock in/out times
- **Manual hours entries** - add hours with custom descriptions (e.g., "1.5h WFH Server")
- **Day type options** - Regular, On Call, Holiday, Called Off, Office Closed Early, Vacation
- **Auto-calculate hours** from time ranges (e.g., "9:00 AM - 5:00 PM")
- **Export to PDF** - professional formatted timesheet output
- **Print functionality** - print directly from the app
- **Personal leave tracking**
- **Configurable settings** - employee name, auto-fill preferences, display options

## Installation

### For Users
Download the latest installer from the [Releases](https://github.com/mastersjw/homecare-timesheet/releases) page.

### For Developers
1. Install dependencies:
```bash
npm install
```

2. Run the application:
```bash
npm start
```

## Building

To create a distributable Windows executable:
```bash
npm run build:win
```

The installer will be created in the `dist` folder.

## Usage

### Getting Started
1. **Select Pay Period**: Choose your pay period from the dropdown (or select "Template" to create a reusable template)
2. **Enter Employee Name**: Your name will be saved in settings for future use
3. The timesheet automatically loads any previously saved data for the selected pay period

### Recording Time
- **Add Time Entries**: Click "+ Add Time" to add clock in/out times for a day
- **Add Manual Hours**: Click "Add Hours" (if enabled in settings) to add hours with descriptions
- **Enter Time Ranges**: Type time ranges like "8:00 AM - 4:30 PM" and press Tab to auto-calculate
- **Select Day Type**: Choose from Regular, On Call, Holiday, Called Off, Office Closed Early, or Vacation

### Settings (Options Button)
- **Employee Name**: Set your name to auto-populate on all timesheets
- **Auto-fill from Template**: Automatically load template data when creating new pay periods
- **Show Add Hours Button**: Toggle visibility of manual hours entry button

### Template System
1. Select "Template" from the pay period dropdown
2. Enter your typical schedule (without dates)
3. Data saves automatically as template.json
4. Enable "Auto-fill from Template" in settings to apply this template to new pay periods

### Saving & Exporting
- **Auto-Save**: Timesheets save automatically as you work (stored in app data folder)
- **Save As**: Use the Save button to save a copy to a custom location
- **Load**: Load a previously saved timesheet file
- **Export PDF**: Create a PDF version of your timesheet
- **Print**: Print directly using Ctrl+P or the browser print function

### Totals & Overtime
- Week totals, grand total, and overtime are calculated automatically
- Overtime is any hours over 80 in the bi-weekly period
- All calculations update in real-time as you enter data

## File Storage

Timesheets are automatically saved to:
```
Windows: %APPDATA%/homecare-timesheet/saves/
```

Settings are stored in:
```
Windows: %APPDATA%/homecare-timesheet/settings.json
```

## License

MIT
