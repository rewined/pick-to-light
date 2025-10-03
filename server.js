const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// Simple HTTP server with proxy
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

  // Proxy endpoint for WLED
  if (req.url.startsWith('/api/wled')) {
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const wledHost = urlParams.searchParams.get('host');

    if (!wledHost) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing host parameter' }));
      return;
    }

    // Collect POST body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      // Forward request to WLED
      const wledUrl = `${wledHost}/json/state`;
      const parsedUrl = new URL(wledUrl);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const proxyReq = http.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
          data += chunk;
        });

        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      proxyReq.on('error', (error) => {
        console.error('Proxy error:', error);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Failed to reach WLED controller',
          message: error.message
        }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });

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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
