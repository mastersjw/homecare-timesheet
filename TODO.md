# Homecare Timesheet - Roadmap for Server Integration

## Overview
Add server-based timesheet submission and approval workflow with Cloudflare Tunnel integration, Topaz signature support, and supervisor authentication.

## Current Workflow
Employee → Fill timesheet → Print → Sign (paper) → Give to supervisor → Supervisor signs → Send to HR

## Target Workflow
Employee → Fill timesheet → Sign (digital) → Submit to server → Supervisor reviews in app → Supervisor signs → Print/Export

---

## Architecture Components

### 1. Server Stack (Ubuntu Server + Docker)
- **API Server**: Node.js/Express
- **Database**: PostgreSQL or SQLite
- **Cloudflare Tunnel**: Zero Trust access (no port forwarding)
- **Authentication**: JWT tokens for supervisor sessions

**Docker Compose Services:**
- `api` - Node.js API server
- `database` - PostgreSQL
- `cloudflared` - Cloudflare Tunnel

### 2. Enhanced Timesheet Data Model

```javascript
{
  id: "uuid-v4",                          // Unique ID for each submission
  employeeId: "emp123",                   // Employee identifier
  employeeName: "John Doe",
  payPeriod: "11/2/2025 - 11/15/2025",
  submittedAt: timestamp,
  status: "pending" | "approved" | "rejected",
  employeeSignature: base64_image_data,   // Topaz or canvas signature
  supervisorSignature: base64_image_data | null,
  supervisorId: "sup456" | null,
  supervisorName: string | null,
  approvedAt: timestamp | null,
  rejectedAt: timestamp | null,
  rejectionReason: string | null,
  timesheetData: {
    /* existing week1, week2, personalLeave structure */
  }
}
```

### 3. Authentication Strategy

**Employee Mode** (default - no authentication):
- Fill timesheets
- Submit timesheets (one-way)
- Local save/load still works
- Cannot view other employees' timesheets

**Supervisor Mode** (requires login):
- "Supervisor Login" button in app
- JWT session token
- Access to "Pending Timesheets" section
- Can approve/reject/sign timesheets
- View submission history

**Settings additions:**
```javascript
{
  supervisorMode: false,
  supervisorToken: null,
  serverUrl: "https://your-cloudflare-tunnel.com",
  supervisorId: null
}
```

### 4. Topaz Signature Integration

**Options:**
1. **Topaz SigWeb** (Web-based, easier for Electron) ⭐ Recommended for Phase 1
2. **Node.js Native Addons** (more complex but better integration)
3. **Canvas-based fallback** (for non-Topaz users)

**Strategy**: Start with canvas-based signatures, add Topaz as enhancement

### 5. Storage Strategy (Conflict Resolution)

**Problem**: Name conflicts with pay period dates

**Solution**: Separate storage paths
```
userData/saves/           # Employee's local timesheets
  └── timesheet-11-2-2025.json

Server storage:           # Submitted timesheets (UUID-based)
  └── Don't save locally, only on server

userData/approved/        # Supervisor's approved timesheets (optional cache)
  └── uuid-timesheet.json
```

---

## Workflows

### Employee Workflow
1. Fill timesheet (existing functionality)
2. Click "Sign" button → Capture signature (Topaz or canvas)
3. Click "Submit to Supervisor"
4. Select supervisor from dropdown list
5. Timesheet sent to server with status="pending"
6. Employee receives confirmation message
7. Optional: Email notification sent to supervisor

### Supervisor Workflow
1. Open app → Click "Supervisor Mode" → Login
2. View "Pending Timesheets" list (table view)
   - Employee name
   - Pay period
   - Submitted date
   - Status
3. Select timesheet to review
4. Review hours in read-only view
5. Options:
   - **Approve**: Capture signature → Mark approved
   - **Reject**: Enter reason → Mark rejected
6. Approved timesheets can be printed/exported
7. Optional: Notifications sent to employee

---

## API Endpoints

### Public Endpoints (no auth required)
```
POST /api/timesheets/submit          # Submit new timesheet
GET  /api/supervisors/list            # Get list of supervisors
GET  /api/health                      # Health check
```

### Protected Endpoints (supervisor auth required)
```
POST /api/auth/login                  # Supervisor login
POST /api/auth/logout                 # Supervisor logout
GET  /api/timesheets/pending          # Get all pending timesheets
GET  /api/timesheets/approved         # Get approved timesheets
GET  /api/timesheets/rejected         # Get rejected timesheets
GET  /api/timesheets/:id              # Get specific timesheet
POST /api/timesheets/:id/approve      # Approve timesheet
POST /api/timesheets/:id/reject       # Reject timesheet with reason
POST /api/timesheets/:id/sign         # Add supervisor signature
```

---

## Security Considerations

1. **Cloudflare Tunnel** - Automatic HTTPS, no exposed ports
2. **Rate Limiting** - Prevent submission spam
3. **Password Security** - bcrypt hashing for supervisor passwords
4. **JWT Tokens** - Short expiration (24 hours)
5. **Input Validation** - Validate all incoming data
6. **CORS Configuration** - Restrict to Electron app origin
7. **SQL Injection Prevention** - Parameterized queries
8. **File Upload Limits** - Signature image size limits

---

## Implementation Phases

### Phase 1: MVP (Core Functionality)
- [x] Set up Ubuntu server with Docker
- [x] Configure Cloudflare Tunnel (with custom domain homecaremt.org)
- [x] Create basic Node.js API server
- [x] Set up PostgreSQL database
- [x] Implement timesheet submission endpoint
- [x] Create supervisor authentication
- [x] Build pending timesheets view
- [x] Add canvas-based signature capture
- [x] Update Electron app with:
  - [x] Sign button
  - [x] Submit to supervisor feature
  - [x] Supervisor mode toggle
  - [x] Supervisor login screen
  - [x] Pending timesheets list
  - [x] Timesheet review interface
- [x] Test end-to-end workflow

### Phase 2: Enhancements
- [ ] Integrate Topaz signature pads
- [ ] Add email notifications (supervisor & employee)
- [ ] Implement timesheet search/filter
- [ ] Add bulk approval features
- [ ] Create rejection workflow with comments
- [ ] Add timesheet history view
- [ ] Implement data export (CSV/Excel)
- [ ] Add supervisor dashboard with statistics

### Phase 3: Advanced Features
- [ ] Mobile app for supervisors (React Native/Flutter)
- [ ] Automated reminder system
- [ ] Analytics dashboard
- [ ] Integration with payroll systems
- [ ] Multi-level approval workflow
- [ ] Audit trail with full change history
- [ ] Advanced reporting features
- [ ] Backup and disaster recovery

---

## Open Questions / Decisions Needed

1. **Multiple Supervisors?**
   - Can employees choose their supervisor?
   - Or is there a fixed hierarchy/assignment?
   - Should we support multiple supervisors per employee?

2. **Rejection Workflow?**
   - Can employees resubmit after rejection?
   - Should rejected timesheets be editable?
   - How many times can a timesheet be rejected/resubmitted?

3. **Offline Mode?**
   - What happens if server is unreachable?
   - Queue submissions for later?
   - Show graceful error messages?

4. **Data Retention?**
   - How long to keep pending timesheets?
   - Archive approved timesheets after how long?
   - Automatic cleanup policy?

5. **Audit Trail?**
   - Track all status changes?
   - Log who made changes and when?
   - Store IP addresses for security?

6. **Notification System?**
   - Email notifications required?
   - Desktop notifications in app?
   - SMS notifications for urgent items?

7. **Supervisor Management?**
   - Who creates supervisor accounts?
   - Self-registration or admin-created?
   - Password reset workflow?

8. **Employee Identification?**
   - Use employee name (current) or assign IDs?
   - How to prevent impersonation?
   - Should employees have accounts too?

---

## Technical Research Needed

### Topaz Signature Pad Integration
- [ ] Research Topaz SigWeb JavaScript library
- [ ] Check compatibility with Electron
- [ ] Test signature capture and export
- [ ] Evaluate licensing costs
- [ ] Determine fallback strategy

### Cloudflare Tunnel Setup
- [x] Create Cloudflare account
- [x] Set up tunnel on Ubuntu server
- [x] Configure DNS settings (homecaremt.org)
- [x] Test connectivity from Electron app
- [x] Document setup process (CLOUDFLARE_TUNNEL_SETUP.md, CLOUDFLARE_QUICK_START.md, CLOUDFLARE_TOKEN_METHOD.md)

### Database Schema Design
- [x] Design users table (supervisors)
- [x] Design timesheets table
- [x] Design signatures table (stored as base64 in timesheets table)
- [ ] Design audit_log table (future enhancement)
- [x] Plan indexing strategy

---

## UI/UX Changes for Electron App

### New Screens/Modals
1. **Signature Capture Modal**
   - Canvas for drawing signature
   - Clear/Redo buttons
   - Save button

2. **Supervisor Login Screen**
   - Username field
   - Password field
   - Remember me checkbox
   - Login button

3. **Submit Timesheet Modal**
   - Supervisor dropdown
   - Optional notes field
   - Confirm button

4. **Pending Timesheets View**
   - Table with filtering/sorting
   - Status indicators
   - Quick action buttons

5. **Timesheet Review Screen**
   - Read-only timesheet display
   - Employee signature display
   - Approve/Reject buttons
   - Signature capture for approval

### Modified Screens
- **Settings Page**: Add server URL, supervisor mode toggle
- **Main Timesheet**: Add "Sign" and "Submit" buttons
- **Header**: Add "Supervisor Mode" indicator

---

## File Structure (New Components)

```
homecare-timesheet/
├── server/                          # New server directory
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── timesheets.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Timesheet.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validation.js
│   │   └── db/
│   │       └── schema.sql
│   ├── package.json
│   └── .env.example
│
├── src/                             # Reorganize Electron app
│   ├── main/
│   │   └── main.js
│   ├── preload/
│   │   └── preload.js
│   ├── renderer/
│   │   ├── index.html
│   │   ├── settings.html
│   │   ├── supervisor.html         # New
│   │   ├── js/
│   │   │   ├── renderer.js
│   │   │   ├── settings.js
│   │   │   ├── supervisor.js       # New
│   │   │   ├── signature.js        # New
│   │   │   └── api-client.js       # New
│   │   └── css/
│   │       └── styles.css
│   └── assets/
│       └── Logo.png
│
└── docs/
    ├── SERVER_SETUP.md              # New
    ├── API_DOCUMENTATION.md         # New
    └── CLOUDFLARE_SETUP.md          # New
```

---

## Next Steps Priority

1. **Server Setup** - Create Docker Compose config + basic API
2. **Database Schema** - Design full table structure
3. **Cloudflare Tunnel Guide** - Step-by-step setup for Ubuntu server
4. **UI Prototypes** - Design supervisor mode interface
5. **Topaz Research** - Evaluate integration options

---

## Version Planning

- **v1.2.0** - Current version (Salary mode)
- **v1.3.0** - Signature capture (canvas-based)
- **v1.4.0** - Server submission (employee workflow)
- **v1.5.0** - Supervisor mode (review & approval)
- **v1.6.0** - Topaz signature pad integration
- **v2.0.0** - Full production release with all Phase 1 features

---

## Notes

- Keep backward compatibility - existing local save/load must still work
- Server integration should be optional (configurable in settings)
- Graceful degradation if server is unavailable
- Consider mobile responsiveness for future mobile supervisor app
- Plan for scalability (multiple locations, hundreds of employees)

---

**Last Updated**: 2025-11-26
**Status**: Phase 1 Complete! ✅
**Production URL**: https://homecaremt.org
**Next Review**: Before starting Phase 2
