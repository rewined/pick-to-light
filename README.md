# Pick-to-Light WLED Controller

Production-ready web application for controlling WLED segments in fulfillment systems.

## Features

- 4 segment control (A, B, C, D) for pick-to-light zones
- Brightness and color control
- Mobile-friendly interface
- HTTPS support with HTTP WLED proxy
- Tailscale VPN integration for secure network access

## Setup Instructions

### 1. Tailscale Setup (Required for Railway deployment)

#### A. Create Tailscale Auth Key
1. Go to https://login.tailscale.com/admin/settings/keys
2. Generate a new **auth key** with these settings:
   - Reusable: ✓ (recommended)
   - Ephemeral: ✗ (keep devices registered)
   - Tags: `tag:railway` (optional)
3. Copy the auth key (starts with `tskey-auth-...`)

#### B. Set up Subnet Router in Warehouse
On a computer/Raspberry Pi in your warehouse network:

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect and advertise your subnet
sudo tailscale up --advertise-routes=192.168.0.0/24

# On Tailscale admin console, approve the subnet route
```

#### C. Configure Railway
1. In Railway dashboard, go to your project
2. Add environment variable:
   - `TAILSCALE_AUTH_KEY` = `tskey-auth-xxxxxxxxxxxxx`
3. Deploy

### 2. WLED Configuration

1. Access WLED controller at `http://192.168.0.75`
2. Go to Config → WiFi Setup
3. Connect to your network
4. Note the IP address assigned

### 3. Usage

1. Open https://pick-to-light-production.up.railway.app
2. Enter WLED controller IP: `http://192.168.0.75`
3. Set brightness and color
4. Click segment buttons A, B, C, D to control zones

## Architecture

```
Browser (HTTPS)
    ↓
Railway App (HTTPS + Tailscale VPN)
    ↓
Tailscale Network
    ↓
Warehouse Subnet Router
    ↓
WLED Controller (HTTP 192.168.0.75)
```

## Segment Mapping

- **Segment A** (ID 0): LEDs 0–74
- **Segment B** (ID 1): LEDs 75–149
- **Segment C** (ID 2): LEDs 150–224
- **Segment D** (ID 3): LEDs 225–299

## Local Development

```bash
# Start local server (no Tailscale needed)
node server.js

# Access at http://localhost:8080
```

## Troubleshooting

### "Can't reach controller"
- Verify WLED is on same network
- Check WLED IP hasn't changed
- Ensure Tailscale subnet routes are approved
- Check Railway logs for Tailscale connection status

### CORS Errors
- WLED 0.14+ has CORS enabled by default
- Check Security settings if using older version

## License

MIT
