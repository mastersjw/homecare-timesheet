# Cloudflare Tunnel - Quick Start Guide

This is the fastest way to get Cloudflare Tunnel running with your timesheet server using Docker.

## Prerequisites

- Domain added to Cloudflare
- Server with Docker and Docker Compose installed
- Timesheet server already set up (from SERVER_SETUP.md)

---

## Option 1: Quick Setup (Recommended - 5 minutes)

This method uses a tunnel token which is the easiest approach.

### Step 1: Create Tunnel in Cloudflare Dashboard

1. Go to https://one.dash.cloudflare.com/
2. Click **Networks** → **Tunnels**
3. Click **Create a tunnel**
4. Select **Cloudflared**
5. Name it `timesheet` and click **Save tunnel**
6. **Copy the tunnel token** (long string starting with `ey...`)

### Step 2: Configure the Tunnel

In the Cloudflare dashboard:

1. Under **Public Hostname**, click **Add a public hostname**
2. Fill in:
   - **Subdomain**: `timesheet`
   - **Domain**: Select your domain
   - **Service Type**: `HTTP`
   - **URL**: `timesheet-api:3000`
3. Click **Save hostname**

### Step 3: Add Token to Server

SSH to your server:

```bash
cd ~/homecare-timesheet-server
nano .env
```

Add this line (replace with your actual token):
```env
TUNNEL_TOKEN=your_tunnel_token_here
```

### Step 4: Update Docker Compose

```bash
# Backup existing config
cp docker-compose.yml docker-compose.yml.backup

# Download the new config with Cloudflare support
# (Or manually add the cloudflared service shown in docker-compose-with-tunnel.yml)
```

Add this service to your `docker-compose.yml`:

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    networks:
      - timesheet-network
    depends_on:
      - timesheet-api
```

### Step 5: Start Everything

```bash
# Stop existing containers
docker-compose down

# Start with Cloudflare Tunnel
docker-compose up -d

# Check logs
docker-compose logs -f cloudflared
```

You should see: `Connection registered`

### Step 6: Test

Visit: `https://timesheet.yourdomain.com/api/health`

You should see the health check response!

---

## Option 2: Manual Setup (More Control)

Follow the detailed guide in `CLOUDFLARE_TUNNEL_SETUP.md` for:
- Installing cloudflared directly on the host
- Creating config files manually
- Running as a systemd service
- Advanced configuration options

---

## Updating Electron App

Once the tunnel is working:

1. Open Electron app
2. Go to **Options**
3. Enable **Server Connections**
4. Set **Server URL**: `https://timesheet.yourdomain.com`
5. Save

---

## Troubleshooting

### Tunnel not connecting

```bash
# Check container logs
docker-compose logs cloudflared

# Restart the tunnel
docker-compose restart cloudflared
```

### Can't reach the API

```bash
# Test from inside the network
docker exec -it cloudflare-tunnel wget -O- http://timesheet-api:3000/api/health

# Should return JSON health check
```

### Domain not resolving

1. Check Cloudflare DNS has the CNAME record
2. Wait 1-2 minutes for DNS propagation
3. Try: `nslookup timesheet.yourdomain.com`

---

## Managing the Tunnel

### View Tunnel Status

```bash
docker-compose ps cloudflared
```

### View Tunnel Logs

```bash
docker-compose logs -f cloudflared
```

### Restart Tunnel

```bash
docker-compose restart cloudflared
```

### Stop Tunnel (keep API running)

```bash
docker stop cloudflare-tunnel
```

### Remove Tunnel

```bash
# Stop and remove
docker-compose rm -sf cloudflared

# Remove from docker-compose.yml
# Delete tunnel in Cloudflare dashboard
```

---

## Security Checklist

Once working:

- [ ] Change default admin password
- [ ] Enable Cloudflare WAF
- [ ] Set SSL/TLS to "Full"
- [ ] Add supervisor users
- [ ] Set up database backups
- [ ] Configure access policies (optional)
- [ ] Monitor tunnel health

---

## Architecture

```
Electron App → Cloudflare → Tunnel → Docker:API → Docker:PostgreSQL
                 (HTTPS)      (secure)   (HTTP)      (internal)
```

---

## Next Steps

- Test from outside your network (mobile data)
- Set up automatic database backups
- Configure Cloudflare security rules
- Add monitoring/alerts

---

**Estimated Setup Time**: 5-10 minutes
**Cost**: FREE (Cloudflare Tunnel is free, unlimited bandwidth)
