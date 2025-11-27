# Adding DELETE Endpoint to Timesheet Server

## Step 1: SSH to Your Server

```bash
ssh username@your-server-ip
cd ~/homecare-timesheet-server
```

## Step 2: Edit the Server File

```bash
nano server/src/server.js
```

## Step 3: Add DELETE Endpoint

Find the section with the other timesheet endpoints (around where you see `/api/timesheets/:id/approve` and `/api/timesheets/:id/reject`).

Add this new endpoint **BEFORE** the catch-all error handler:

```javascript
// Delete timesheet
app.delete('/api/timesheets/:id', authenticateSupervisor, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM timesheets WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Timesheet not found'
            });
        }

        res.json({
            success: true,
            message: 'Timesheet deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete timesheet'
        });
    }
});
```

## Step 4: Save and Exit

- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

## Step 5: Restart the Server

```bash
docker-compose restart timesheet-api
```

## Step 6: Test the Endpoint

```bash
# Check if the API restarted successfully
docker logs timesheet-api
```

You should see the server starting without errors.

## Done!

Now the delete functionality in the Electron app will work. You can:
- Go to Supervisor Mode
- Click the "Delete" button on any timesheet
- Confirm the deletion
- The timesheet will be permanently removed from the database

## Troubleshooting

If the endpoint doesn't work:

1. **Check API logs:**
   ```bash
   docker logs -f timesheet-api
   ```

2. **Verify the endpoint was added correctly:**
   ```bash
   nano server/src/server.js
   # Look for the DELETE endpoint
   ```

3. **Make sure it's BEFORE the error handler:**
   The endpoint must be added before any catch-all routes or error handlers.

4. **Test directly with curl:**
   ```bash
   # Get a token first (login as supervisor)
   curl -X POST https://homecaremt.org/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"your-username","password":"your-password"}'

   # Use the token to delete a timesheet
   curl -X DELETE https://homecaremt.org/api/timesheets/TIMESHEET_ID_HERE \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## Alternative: Full Server Code Reference

If you're not sure where to add it, here's the typical structure:

```javascript
// ... other endpoints ...

// Get specific timesheet
app.get('/api/timesheets/:id', authenticateSupervisor, async (req, res) => {
    // ... existing code ...
});

// Approve timesheet
app.post('/api/timesheets/:id/approve', authenticateSupervisor, async (req, res) => {
    // ... existing code ...
});

// Reject timesheet
app.post('/api/timesheets/:id/reject', authenticateSupervisor, async (req, res) => {
    // ... existing code ...
});

// DELETE ENDPOINT - ADD THIS NEW SECTION HERE
app.delete('/api/timesheets/:id', authenticateSupervisor, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM timesheets WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Timesheet not found'
            });
        }

        res.json({
            success: true,
            message: 'Timesheet deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete timesheet'
        });
    }
});

// ... error handlers and other routes ...
```
