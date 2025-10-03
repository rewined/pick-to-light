const http = require('http');
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');

const PORT = process.env.PORT || 8080;

// MQTT Configuration
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

// Connect to MQTT broker
console.log('Connecting to MQTT broker:', MQTT_BROKER);
const mqttClient = mqtt.connect(MQTT_BROKER, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 30000
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  // Subscribe to status topics from all controllers
  mqttClient.subscribe('wled/+/status', (err) => {
    if (!err) {
      console.log('📡 Subscribed to WLED status topics');
    }
  });
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT connection error:', error);
});

mqttClient.on('message', (topic, message) => {
  console.log(`📥 Received: ${topic} - ${message.toString()}`);
});

// Simple HTTP server with MQTT publishing
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoint for MQTT publishing
  if (req.url.startsWith('/api/wled')) {
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const controllerId = urlParams.searchParams.get('controller') || 'controller-01';

    // Collect POST body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const wledCommand = JSON.parse(body);
        const topic = `wled/${controllerId}/api`;

        console.log(`📤 Publishing to ${topic}:`, wledCommand);

        // Publish to MQTT
        mqttClient.publish(topic, JSON.stringify(wledCommand), { qos: 1 }, (err) => {
          if (err) {
            console.error('❌ MQTT publish error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Failed to publish MQTT message',
              message: err.message
            }));
          } else {
            console.log('✅ Command sent successfully');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, topic, command: wledCommand }));
          }
        });
      } catch (error) {
        console.error('❌ JSON parse error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON', message: error.message }));
      }
    });

    return;
  }

  // Zone-based API endpoint
  if (req.url.startsWith('/api/zones/')) {
    const match = req.url.match(/\/api\/zones\/([^\/]+)\/light/);
    if (match) {
      const zoneId = match[1];

      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { action, color, brightness, duration } = JSON.parse(body);

          // Map zone to controller (example mapping)
          // In production, this would query a database
          const controllerId = `controller-${zoneId}`;
          const segmentId = 0; // Assuming zone maps to segment 0

          const wledCommand = {
            seg: [{
              id: segmentId,
              on: action === 'activate',
              bri: brightness || 128,
              col: [hexToRgb(color || '#00FF00')]
            }]
          };

          const topic = `wled/${controllerId}/api`;
          console.log(`📤 Zone ${zoneId} → ${topic}:`, wledCommand);

          mqttClient.publish(topic, JSON.stringify(wledCommand), { qos: 1 }, (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to control zone', message: err.message }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                zone: zoneId,
                controller: controllerId,
                action
              }));
            }
          });

        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request', message: error.message }));
        }
      });

      return;
    }
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      mqtt: mqttClient.connected ? 'connected' : 'disconnected',
      broker: MQTT_BROKER
    }));
    return;
  }

  // Serve index.html for all other requests
  if (req.method === 'GET') {
    const filePath = path.join(__dirname, 'index.html');

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

// Helper function: Convert HEX to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 MQTT broker: ${MQTT_BROKER}`);
  console.log(`🌐 Open http://localhost:${PORT}`);
});
