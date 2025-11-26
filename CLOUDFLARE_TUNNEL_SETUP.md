# Cloudflare Tunnel Setup for Homecare Timesheet Server

This guide shows you how to set up Cloudflare Tunnel to securely access your timesheet server from anywhere without opening firewall ports or exposing your IP address.

## What is Cloudflare Tunnel?

Cloudflare Tunnel creates a secure, outbound-only connection from your server to Cloudflare's network. This means:
- ✅ No need to open firewall ports
- ✅ No need to expose your home IP address
- ✅ Free HTTPS encryption
- ✅ Access from anywhere via a custom subdomain
- ✅ DDoS protection

---

## Prerequisites

1. **Cloudflare Account** (free)
   - Sign up at https://dash.cloudflare.com/sign-up

2. **Domain Name** added to Cloudflare
   - Either register a domain through Cloudflare
   - Or transfer your existing domain's nameservers to Cloudflare

3. **Ubuntu Server** with Docker and your timesheet API already running
   - Follow `SERVER_SETUP.md` first if you haven't already

---

## Step 1: Install Cloudflare Tunnel (cloudflared)

SSH into your Ubuntu server:

```bash
ssh username@192.168.1.XXX
```

Download and install cloudflared:

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install it
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

---

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will:
1. Open a browser window (or show you a URL to visit)
2. Ask you to select your domain
3. Download a certificate to `~/.cloudflared/cert.pem`

If you're on a headless server and can't open a browser:
- Copy the URL shown
- Open it on your local machine
- Complete the authentication
- The cert will still be saved on the server

---

## Step 3: Create a Tunnel

```bash
# Create a tunnel named "timesheet"
cloudflared tunnel create timesheet

# This creates a tunnel with a unique ID
# Example output: Created tunnel timesheet with id 12345678-1234-1234-1234-123456789abc
```

**Important**: Save the tunnel ID shown in the output!

View your tunnels:
```bash
cloudflared tunnel list
```

---

## Step 4: Create Tunnel Configuration

Create the configuration directory:

```bash
mkdir -p ~/.cloudflared
```

Create the config file:

```bash
nano ~/.cloudflared/config.yml
```

Paste this configuration (replace `TUNNEL_ID` and `yourdomain.com`):

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/YOUR_USERNAME/.cloudflared/TUNNEL_ID.json

ingress:
  # Route timesheet subdomain to your API
  - hostname: timesheet.yourdomain.com
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true

  # Catch-all rule (required)
  - service: http_status:404
```

**Replace**:
- `TUNNEL_ID` - The ID from Step 3
- `YOUR_USERNAME` - Your Ubuntu username
- `yourdomain.com` - Your actual domain

**Example**:
```yaml
tunnel: 12345678-1234-1234-1234-123456789abc
credentials-file: /home/jason/.cloudflared/12345678-1234-1234-1234-123456789abc.json

ingress:
  - hostname: timesheet.example.com
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

Save and exit (Ctrl+X, Y, Enter).

---

## Step 5: Create DNS Record

Route your subdomain through the tunnel:

```bash
cloudflared tunnel route dns timesheet timesheet.yourdomain.com
```

Replace:
- `timesheet` - Your tunnel name
- `timesheet.yourdomain.com` - Your desired subdomain

This automatically creates a CNAME record in Cloudflare DNS.

---

## Step 6: Test the Tunnel

Run the tunnel manually first to test:

```bash
cloudflared tunnel run timesheet
```

You should see output like:
```
2024-11-26 12:00:00 INF Connection established
2024-11-26 12:00:00 INF Each HA connection's tunnel IDs
```

**Test from your local machine:**

Open a browser and visit:
```
https://timesheet.yourdomain.com/api/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-11-26T12:00:00.000Z",
  "service": "homecare-timesheet-api",
  "version": "1.0.0"
}
```

✅ If it works, press Ctrl+C to stop the tunnel and proceed to Step 7.

❌ If it doesn't work, check the troubleshooting section below.

---

## Step 7: Run Tunnel as a Service

Install the tunnel as a systemd service so it runs automatically:

```bash
sudo cloudflared service install
```

This creates a systemd service that:
- Starts automatically on boot
- Restarts if it crashes
- Runs in the background

Start the service:

```bash
sudo systemctl start cloudflared
```

Enable it to start on boot:

```bash
sudo systemctl enable cloudflared
```

Check status:

```bash
sudo systemctl status cloudflared
```

View logs:

```bash
sudo journalctl -u cloudflared -f
```

---

## Step 8: Update Electron App Settings

Now that your server is accessible via Cloudflare Tunnel, update your Electron app:

1. Open the Electron app
2. Go to **Options**
3. Enable **Server Connections**
4. Set **Server URL** to:
   ```
   https://timesheet.yourdomain.com
   ```
5. Click **Save**

**Important**: Use `https://` (not `http://`). Cloudflare automatically provides SSL!

---

## Step 9: Test End-to-End

1. **Submit a timesheet** from the Electron app
2. **Open Supervisor Mode** in the Electron app
3. **Login** with:
   - Username: `admin`
   - Password: `admin123` (change this in production!)
4. **Review and approve** the timesheet

If everything works, you're done! 🎉

---

## Managing the Tunnel

### Start/Stop the Tunnel Service

```bash
# Start
sudo systemctl start cloudflared

# Stop
sudo systemctl stop cloudflared

# Restart
sudo systemctl restart cloudflared

# Check status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

### View Tunnel Info

```bash
# List all tunnels
cloudflared tunnel list

# Get tunnel info
cloudflared tunnel info timesheet
```

### Delete a Tunnel

```bash
# Stop the service first
sudo systemctl stop cloudflared

# Delete the tunnel
cloudflared tunnel delete timesheet

# Remove DNS records manually from Cloudflare dashboard
```

---

## Troubleshooting

### Tunnel starts but site is unreachable

1. **Check DNS propagation**:
   ```bash
   nslookup timesheet.yourdomain.com
   ```
   Should show a CNAME to `TUNNEL_ID.cfargotunnel.com`

2. **Check API is running**:
   ```bash
   curl http://localhost:3001/api/health
   ```

3. **Check tunnel logs**:
   ```bash
   sudo journalctl -u cloudflared -f
   ```

4. **Verify config file**:
   ```bash
   cat ~/.cloudflared/config.yml
   ```

### "Unable to reach origin service" error

The tunnel can't connect to your API. Check:

1. **Is Docker running?**
   ```bash
   docker ps
   ```
   Should show `timesheet-api` container

2. **Is API accessible locally?**
   ```bash
   curl http://localhost:3001/api/health
   ```

3. **Check Docker logs**:
   ```bash
   docker-compose logs -f timesheet-api
   ```

### Tunnel service won't start

```bash
# Check service status
sudo systemctl status cloudflared

# View detailed logs
sudo journalctl -u cloudflared -n 50 --no-pager

# Check config file syntax
cloudflared tunnel ingress validate
```

### CORS errors in the app

If you see CORS errors in the browser console:

1. Update `docker-compose.yml` to allow your domain:
   ```yaml
   environment:
     - CORS_ORIGIN=https://timesheet.yourdomain.com
   ```

2. Or allow all origins (less secure):
   ```yaml
   environment:
     - CORS_ORIGIN=*
   ```

3. Restart Docker:
   ```bash
   docker-compose restart timesheet-api
   ```

---

## Security Best Practices

### 1. Change Default Admin Password

**On the server**, connect to the database:

```bash
docker exec -it timesheet-db psql -U timesheet_user -d timesheets
```

Generate a new password hash (on your local machine with Node.js):

```javascript
// Run in Node.js REPL: node
const bcrypt = require('bcrypt');
bcrypt.hash('YOUR_NEW_PASSWORD', 10).then(console.log);
```

Update the password in the database:

```sql
UPDATE supervisors
SET password_hash = 'NEW_HASH_HERE'
WHERE username = 'admin';
```

### 2. Add Additional Supervisors

```sql
INSERT INTO supervisors (username, password_hash, full_name, email)
VALUES (
    'jane.doe',
    'BCRYPT_HASH_HERE',
    'Jane Doe',
    'jane@example.com'
);
```

### 3. Enable Cloudflare Security Features

In your Cloudflare dashboard:

1. **SSL/TLS** → Set to "Full" or "Full (strict)"
2. **Security** → Enable "Bot Fight Mode"
3. **Security** → Configure WAF rules
4. **Speed** → Enable caching (careful with API routes)

### 4. Monitor Access

View Cloudflare analytics:
- Go to your Cloudflare dashboard
- Select your domain
- Check **Analytics** for traffic, threats, and errors

### 5. Restrict Access by IP (Optional)

In Cloudflare, create a firewall rule:

1. **Security** → **WAF** → **Create rule**
2. Example: Block all except your office IP
   ```
   (ip.src ne YOUR.OFFICE.IP) and (http.host eq "timesheet.yourdomain.com")
   → Block
   ```

---

## Alternative: Access Control with Cloudflare Access (Advanced)

For additional security, you can require login before accessing the timesheet:

1. **Cloudflare Zero Trust** → **Access** → **Applications**
2. **Add an application**
3. Set domain: `timesheet.yourdomain.com`
4. Configure authentication (email, Google, etc.)
5. Set access policies (who can access)

This adds a login page BEFORE the timesheet app, providing an extra layer of security.

---

## Costs

- **Cloudflare Tunnel**: FREE (unlimited bandwidth)
- **Domain Name**: ~$10-15/year (if buying new)
- **Cloudflare Account**: FREE (or $20/month for Pro features)

---

## Architecture Diagram

```
┌─────────────────┐
│  Electron App   │
│  (Anywhere)     │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────┐
│  Cloudflare Network     │
│  (SSL, DDoS, Cache)     │
└────────┬────────────────┘
         │ Cloudflare Tunnel
         ▼
┌─────────────────────────┐
│  Your Home Server       │
│  ┌──────────────────┐   │
│  │ cloudflared      │   │
│  │ (Tunnel Client)  │   │
│  └────────┬─────────┘   │
│           │ HTTP        │
│           ▼             │
│  ┌──────────────────┐   │
│  │ Docker:          │   │
│  │ - API (3001)     │   │
│  │ - PostgreSQL     │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

---

## Next Steps

Once your tunnel is working:

1. ✅ Test from outside your network (use mobile data)
2. ✅ Change the default admin password
3. ✅ Add real supervisor accounts
4. ✅ Configure Cloudflare security settings
5. ✅ Set up database backups
6. ✅ Monitor tunnel health and API logs

---

**Last Updated**: 2025-11-26
**Status**: Production-Ready Setup with Cloudflare Tunnel
