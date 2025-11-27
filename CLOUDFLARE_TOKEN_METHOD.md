# Cloudflare Tunnel - Token Method (Recommended for Remote Servers)

If you're setting up cloudflared on a remote/headless server and the browser login isn't working, use this token-based method instead. It's actually easier!

## Why Token Method?

The `cloudflared tunnel login` command requires browser communication back to the server, which doesn't work well for:
- Remote SSH connections
- Headless servers
- Servers behind NAT/firewall

The **token method** is simpler and works every time.

---

## Step-by-Step Setup

### Step 1: Create Tunnel in Cloudflare Dashboard

1. Go to https://one.dash.cloudflare.com/
2. Select your account
3. Go to **Networks** → **Tunnels**
4. Click **Create a tunnel**
5. Click **Cloudflared** (should be selected by default)
6. Give it a name: `timesheet`
7. Click **Save tunnel**

### Step 2: Get Your Tunnel Token

After creating the tunnel, you'll see installation instructions with a command like:

```bash
sudo cloudflared service install eyJhIjoiX...very_long_token...XYZ
```

**Copy only the token part** (the long string starting with `eyJ`). This is your tunnel token.

**Don't run that command yet!** We'll use a different approach.

### Step 3: Configure Public Hostname

Still in the Cloudflare dashboard:

1. Under **Public Hostname**, click **Add a public hostname**
2. Fill in:
   - **Subdomain**: `timesheet` (or whatever you want)
   - **Domain**: Select your domain from dropdown
   - **Type**: `HTTP`
   - **URL**: `localhost:3001`
3. Expand **Additional application settings** (optional):
   - **HTTP Host Header**: Leave blank or set to `timesheet.yourdomain.com`
   - **No TLS Verify**: Toggle ON (since we're using HTTP locally)
4. Click **Save hostname**

### Step 4: Test with Docker (Easiest Method)

SSH to your server:

```bash
cd ~/homecare-timesheet-server
```

Create a test file to run cloudflared:

```bash
nano docker-compose.test.yml
```

Paste this (replace YOUR_TOKEN_HERE):

```yaml
version: '3.8'

services:
  cloudflared-test:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared-test
    command: tunnel run --token YOUR_TOKEN_HERE
    network_mode: "host"
    restart: unless-stopped
```

Save and exit (Ctrl+X, Y, Enter).

Run it:

```bash
docker-compose -f docker-compose.test.yml up -d

# Check logs
docker logs -f cloudflared-test
```

You should see:
```
2024-11-26 ... INF Connection ... registered connIndex=0
2024-11-26 ... INF Connection ... registered connIndex=1
2024-11-26 ... INF Connection ... registered connIndex=2
2024-11-26 ... INF Connection ... registered connIndex=3
```

### Step 5: Test Your Tunnel

From your local machine (or phone), visit:

```
https://timesheet.yourdomain.com/api/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "homecare-timesheet-api",
  "version": "1.0.0"
}
```

✅ **If it works**, proceed to Step 6!

❌ **If it doesn't work**, check:
- Is the API running? `docker ps` should show `timesheet-api`
- Is the API accessible locally? `curl http://localhost:3001/api/health`
- Check tunnel logs: `docker logs cloudflared-test`

### Step 6: Add to Main Docker Compose

Once it's working, stop the test:

```bash
docker stop cloudflared-test
docker rm cloudflared-test
```

Add the tunnel to your main `docker-compose.yml`:

```bash
nano docker-compose.yml
```

Add this service at the bottom (before `networks:`):

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: unless-stopped
    command: tunnel run --token YOUR_TOKEN_HERE
    network_mode: "host"
```

**Important**: Replace `YOUR_TOKEN_HERE` with your actual token!

Full example:

```yaml
version: '3.8'

services:
  timesheet-api:
    build: ./server
    container_name: timesheet-api
    restart: unless-stopped
    ports:
      - "3001:3000"
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
      - "5433:5432"
    networks:
      - timesheet-network

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: unless-stopped
    command: tunnel run --token YOUR_TOKEN_HERE
    network_mode: "host"

networks:
  timesheet-network:
    driver: bridge

volumes:
  timesheet-db-data:
```

### Step 7: Restart Everything

```bash
docker-compose down
docker-compose up -d

# Check everything is running
docker ps

# Check tunnel logs
docker logs -f cloudflare-tunnel
```

---

## Alternative: Use Environment Variable for Token

For better security, don't hardcode the token in docker-compose.yml:

```bash
# Add to .env file
nano .env
```

Add:
```env
TUNNEL_TOKEN=eyJhIjoiX...your_token_here...XYZ
```

Update docker-compose.yml:
```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: unless-stopped
    command: tunnel run --token ${TUNNEL_TOKEN}
    network_mode: "host"
```

This way the token isn't visible in the docker-compose.yml file.

---

## Managing the Tunnel

### View Status
```bash
docker ps | grep cloudflare-tunnel
```

### View Logs
```bash
docker logs -f cloudflare-tunnel
```

### Restart Tunnel
```bash
docker restart cloudflare-tunnel
```

### Stop Tunnel
```bash
docker stop cloudflare-tunnel
```

### Start Tunnel
```bash
docker start cloudflare-tunnel
```

---

## Updating the Electron App

Once working:

1. Open Electron app
2. Go to **Options**
3. Enable **Server Connections**
4. Set **Server URL**: `https://timesheet.yourdomain.com`
5. Click **Save**

Test by:
- Submitting a timesheet
- Opening Supervisor Mode
- Logging in and reviewing timesheets

---

## Troubleshooting

### Tunnel connects but site shows 502 Bad Gateway

The tunnel is working, but can't reach your API.

**Solution**: Make sure API is running and accessible:
```bash
# Check API is running
docker ps | grep timesheet-api

# Test API directly
curl http://localhost:3001/api/health

# Check API logs
docker logs timesheet-api
```

### Tunnel shows "connection registered" but site times out

**Solution**: Check the hostname configuration in Cloudflare dashboard:
- Service URL should be `localhost:3001` (not `http://localhost:3001`)
- Type should be `HTTP`
- No TLS Verify should be ON

### Can't find tunnel token

Go back to Cloudflare dashboard:
1. **Networks** → **Tunnels**
2. Click on your tunnel name
3. Click **Configure**
4. Scroll to the bottom - there's usually an install command with the token

Or delete and recreate the tunnel to get a fresh token.

---

## Security Notes

### Protecting Your Token

The tunnel token is sensitive! Anyone with it can route traffic through your tunnel.

**Best practices:**
1. Store in `.env` file (add `.env` to `.gitignore`)
2. Don't commit to git
3. Don't share publicly
4. Rotate if compromised (delete tunnel, create new one)

### Regenerating Token

If your token is compromised:
1. Go to Cloudflare dashboard → Tunnels
2. Delete the old tunnel
3. Create a new tunnel
4. Get new token
5. Update your docker-compose.yml or .env

---

## Why This Method is Better

✅ **No browser authentication needed**
✅ **Works on any server** (headless, remote, cloud)
✅ **Easier to automate**
✅ **Simple to manage** (everything in Docker)
✅ **No config files to maintain**

---

**Setup Time**: 5 minutes
**Difficulty**: Easy
**Cost**: FREE
