# Homecare Timesheet Application

A desktop application for tracking employee hours with automatic overtime calculation.

## Features

- Bi-weekly timesheet (14 days)
- Automatic overtime calculation (over 80 hours)
- Auto-calculate hours from time ranges (e.g., "9:00 AM - 5:00 PM")
- Save/Load timesheets as JSON files
- Export to PDF
- Print functionality
- Personal leave tracking

## Installation

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

1. **New Timesheet**: Click "New" to start a fresh timesheet
2. **Enter Information**: Fill in employee name and pay period
3. **Record Hours**:
   - Enter dates for each day worked
   - Enter time range (e.g., "8:00 AM - 4:30 PM") and it will auto-calculate
   - Or manually enter total hours
4. **Personal Leave**: Enter any personal leave hours
5. **View Totals**: Week totals, grand total, and overtime are calculated automatically
6. **Save**: Save your timesheet as a JSON file
7. **Load**: Load a previously saved timesheet
8. **Export PDF**: Export the timesheet as a PDF document
9. **Print**: Print the timesheet directly

## Overtime Calculation

The application calculates overtime based on a standard 80-hour bi-weekly period. Any hours worked beyond 80 hours in the two-week period are counted as overtime.

## License

MIT
