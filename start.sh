#!/bin/sh

# Start Tailscale daemon
echo "Starting Tailscale daemon..."
tailscaled --tun=userspace-networking --socks5-server=localhost:1055 &

# Wait for tailscaled to start
sleep 2

# Authenticate with Tailscale using auth key from environment
if [ -n "$TAILSCALE_AUTH_KEY" ]; then
    echo "Authenticating with Tailscale..."
    tailscale up --authkey=$TAILSCALE_AUTH_KEY --hostname=pick-to-light-railway --accept-routes
    echo "Tailscale connected!"
else
    echo "WARNING: TAILSCALE_AUTH_KEY not set. Tailscale will not connect."
fi

# Set up SOCKS5 proxy for Node.js to use Tailscale network
export ALL_PROXY=socks5://localhost:1055

# Start the Node.js application
echo "Starting Node.js server..."
node server.js
