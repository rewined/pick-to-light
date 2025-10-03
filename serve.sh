#!/bin/bash
# Simple HTTP server for WLED controller

echo "Starting WLED Controller Web Server..."
echo "Open http://localhost:8080 in your browser"
echo "Or use your local IP address from other devices on the network"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Try python3 first, then python
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    python -m http.server 8080
else
    echo "Error: Python not found. Please install Python to run this server."
    exit 1
fi
