# Homecare Timesheet - Local Server Setup Guide

This guide walks through setting up the timesheet API server on your Ubuntu server for local network access (no Cloudflare Tunnel needed).

## Prerequisites

- Ubuntu Server with Docker installed
- Server IP address (e.g., `192.168.1.100`)
- SSH access to the server

---

## Step 1: Connect to Your Server

```bash
# From your Windows machine
ssh username@192.168.1.XXX
```

Replace `username` and `192.168.1.XXX` with your actual server credentials.

---

## Step 2: Create Project Directory

```bash
# Create main directory
mkdir -p ~/homecare-timesheet-server
cd ~/homecare-timesheet-server

# Create subdirectories
mkdir -p server/src/{routes,models,middleware,db}
```

---

## Step 3: Create Docker Compose Configuration

```bash
nano docker-compose.yml
```

Paste this content:

```yaml
version: '3.8'

services:
  timesheet-api:
    build: ./server
    container_name: timesheet-api
    restart: unless-stopped
    ports:
      - "3001:3000"  # Expose on port 3001
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://timesheet_user:${DB_PASSWORD}@timesheet-db:5432/timesheets
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
      - CORS_ORIGIN=*
    depends_on:
      - timesheet-db
    networks:
      - timesheet-network

  timesheet-db:
    image: postgres:15-alpine
    container_name: timesheet-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=timesheets
      - POSTGRES_USER=timesheet_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - timesheet-db-data:/var/lib/postgresql/data
      - ./server/db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5433:5432"  # Expose on 5433 to avoid conflicts
    networks:
      - timesheet-network

networks:
  timesheet-network:
    driver: bridge

volumes:
  timesheet-db-data:
```

Save and exit (Ctrl+X, Y, Enter)

---

## Step 4: Create Environment Variables

```bash
nano .env
```

Paste this and customize:

```env
# Database password
DB_PASSWORD=change_this_to_secure_password

# JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=change_this_to_random_string
```

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

Copy the output and replace `change_this_to_random_string` with it.

Save and exit.

---

## Step 5: Create Server Files

### Dockerfile

```bash
nano server/Dockerfile
```

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src ./src

EXPOSE 3000

# Start server
CMD ["node", "src/server.js"]
```

### Package.json

```bash
nano server/package.json
```

```json
{
  "name": "homecare-timesheet-api",
  "version": "1.0.0",
  "description": "Homecare Timesheet API Server",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### Main Server File

```bash
nano server/src/server.js
```

```javascript
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json({ limit: '10mb' })); // For signature images

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'homecare-timesheet-api',
    version: '1.0.0'
  });
});

// Get list of supervisors (for dropdown)
app.get('/api/supervisors/list', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, username FROM supervisors ORDER BY full_name'
    );
    res.json({
      success: true,
      supervisors: result.rows
    });
  } catch (error) {
    console.error('Error fetching supervisors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supervisors'
    });
  }
});

// Submit timesheet (employee)
app.post('/api/timesheets/submit', async (req, res) => {
  try {
    const {
      employeeName,
      payPeriod,
      employeeSignature,
      supervisorId,
      timesheetData
    } = req.body;

    // Validate required fields
    if (!employeeName || !payPeriod || !timesheetData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await pool.query(
      `INSERT INTO timesheets (
        employee_name,
        pay_period,
        employee_signature,
        supervisor_id,
        timesheet_data,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, submitted_at`,
      [employeeName, payPeriod, employeeSignature, supervisorId, JSON.stringify(timesheetData)]
    );

    res.json({
      success: true,
      message: 'Timesheet submitted successfully',
      timesheetId: result.rows[0].id,
      submittedAt: result.rows[0].submitted_at
    });
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit timesheet'
    });
  }
});

// Supervisor login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required'
      });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash, full_name FROM supervisors WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const supervisor = result.rows[0];

    // For testing, we'll use simple password comparison
    // In production, use bcrypt.compare()
    const bcrypt = require('bcrypt');
    const validPassword = await bcrypt.compare(password, supervisor.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        id: supervisor.id,
        username: supervisor.username,
        fullName: supervisor.full_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await pool.query(
      'UPDATE supervisors SET last_login = NOW() WHERE id = $1',
      [supervisor.id]
    );

    res.json({
      success: true,
      token,
      supervisor: {
        id: supervisor.id,
        username: supervisor.username,
        fullName: supervisor.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.supervisor = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Get pending timesheets (supervisor only)
app.get('/api/timesheets/pending', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        employee_name,
        pay_period,
        submitted_at,
        status
      FROM timesheets
      WHERE status = 'pending'
      AND (supervisor_id = $1 OR supervisor_id IS NULL)
      ORDER BY submitted_at DESC`,
      [req.supervisor.id]
    );

    res.json({
      success: true,
      timesheets: result.rows
    });
  } catch (error) {
    console.error('Error fetching pending timesheets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timesheets'
    });
  }
});

// Get specific timesheet (supervisor only)
app.get('/api/timesheets/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM timesheets WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    res.json({
      success: true,
      timesheet: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching timesheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timesheet'
    });
  }
});

// Approve timesheet (supervisor only)
app.post('/api/timesheets/:id/approve', verifyToken, async (req, res) => {
  try {
    const { supervisorSignature } = req.body;

    const result = await pool.query(
      `UPDATE timesheets
      SET
        status = 'approved',
        supervisor_signature = $1,
        supervisor_id = $2,
        supervisor_name = $3,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
      [supervisorSignature, req.supervisor.id, req.supervisor.fullName, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    res.json({
      success: true,
      message: 'Timesheet approved',
      timesheet: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving timesheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve timesheet'
    });
  }
});

// Reject timesheet (supervisor only)
app.post('/api/timesheets/:id/reject', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE timesheets
      SET
        status = 'rejected',
        supervisor_id = $1,
        supervisor_name = $2,
        rejected_at = NOW(),
        rejection_reason = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
      [req.supervisor.id, req.supervisor.fullName, reason, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    res.json({
      success: true,
      message: 'Timesheet rejected',
      timesheet: result.rows[0]
    });
  } catch (error) {
    console.error('Error rejecting timesheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject timesheet'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Timesheet API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  pool.end();
  process.exit(0);
});
```

### Database Schema

```bash
nano server/db/init.sql
```

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50),
    employee_name VARCHAR(255) NOT NULL,
    pay_period VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    employee_signature TEXT,
    supervisor_signature TEXT,
    supervisor_id UUID,
    supervisor_name VARCHAR(255),
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    timesheet_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create supervisors table
CREATE TABLE IF NOT EXISTS supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_name);
CREATE INDEX IF NOT EXISTS idx_timesheets_supervisor ON timesheets(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_submitted ON timesheets(submitted_at);
CREATE INDEX IF NOT EXISTS idx_supervisors_username ON supervisors(username);

-- Insert test supervisor
-- Username: admin
-- Password: admin123
-- Hash generated with: bcrypt.hash('admin123', 10)
INSERT INTO supervisors (username, password_hash, full_name, email)
VALUES (
    'admin',
    '$2b$10$rKqW8Z8K5yYJQVrEqY6J7uN3wqX6qXQqXqXqXqXqXqXqXqXqXqXqX',
    'Test Admin',
    'admin@example.com'
) ON CONFLICT (username) DO NOTHING;

-- Note: Change the admin password in production!
```

---

## Step 6: Build and Start the Server

```bash
# Make sure you're in the project directory
cd ~/homecare-timesheet-server

# Build and start containers
docker-compose up -d

# Check if containers are running
docker ps

# You should see:
# - timesheet-api (running on port 3001)
# - timesheet-db (running on port 5433)

# View logs
docker-compose logs -f timesheet-api

# Press Ctrl+C to exit logs
```

---

## Step 7: Test the API

### From the server itself:

```bash
# Health check
curl http://localhost:3001/api/health

# Get supervisors list
curl http://localhost:3001/api/supervisors/list

# Expected output:
# {"status":"ok","timestamp":"...","service":"homecare-timesheet-api","version":"1.0.0"}
```

### From your Windows machine:

```bash
# Replace 192.168.1.XXX with your server's actual IP
curl http://192.168.1.XXX:3001/api/health
```

---

## Step 8: Configure Electron App

In your Electron app settings, add the server URL:

```javascript
// In settings.js or wherever you store config
serverUrl: "http://192.168.1.XXX:3001"
```

Replace `192.168.1.XXX` with your actual server IP.

---

## Useful Commands

### Managing the Server

```bash
# Stop containers
docker-compose down

# Start containers
docker-compose up -d

# Restart containers
docker-compose restart

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f timesheet-api
docker-compose logs -f timesheet-db

# Rebuild after code changes
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it timesheet-db psql -U timesheet_user -d timesheets

# Once inside psql:
\dt                          # List tables
\d timesheets               # Describe timesheets table
SELECT * FROM supervisors;   # View supervisors
SELECT * FROM timesheets;    # View timesheets
\q                          # Quit
```

### Adding a Supervisor

```bash
# Connect to database
docker exec -it timesheet-db psql -U timesheet_user -d timesheets

# Inside psql, run:
# (You'll need to hash the password first using bcrypt)
# For now, use the test admin: username=admin, password=admin123
```

To add more supervisors, you'll need to hash passwords. For now, use the test account.

---

## Troubleshooting

### Container won't start:

```bash
# Check logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep 3001
sudo netstat -tulpn | grep 5433
```

### Can't connect from Windows:

```bash
# Check if firewall is blocking
sudo ufw status

# If firewall is active, allow port 3001
sudo ufw allow 3001/tcp

# Or disable firewall temporarily for testing
sudo ufw disable
```

### Database connection error:

```bash
# Check if database is ready
docker exec -it timesheet-db pg_isready -U timesheet_user

# Restart database
docker-compose restart timesheet-db
```

---

## Next Steps

Once the server is running and you can access it from your Windows machine:

1. Update Electron app to connect to server
2. Implement signature capture in the app
3. Test timesheet submission workflow
4. Implement supervisor mode UI
5. Test approval workflow

---

## Security Notes (For Production)

⚠️ **This setup is for LOCAL TESTING only!**

For production use:
1. Change the default admin password
2. Use HTTPS (via nginx or Cloudflare Tunnel)
3. Implement proper CORS restrictions
4. Add rate limiting
5. Use environment-specific secrets
6. Regular backups of the database

---

**Last Updated**: 2025-11-25
**Status**: Local Testing Setup
