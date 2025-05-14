const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const publicDir = path.join(__dirname, 'public');

// ==== API Table: Only /epid stays here ====
const apiRoutes = {
    '/epid': async (data) => {
        const url = "https://jiloviral.com/" + data.data;
        console.log(url);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.text();
        } catch (error) {
            console.error('Fetch error:', error);
            throw new Error(`Error fetching URL: ${error.message}`);
        }
    }
};
// ==========================================

const server = http.createServer(async (req, res) => {
    // --- Add CORS headers ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // --- Handle preflight (OPTIONS) requests ---
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- /epid API (POST) ---
    if (req.method === 'POST' && apiRoutes[req.url]) {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const handler = apiRoutes[req.url];
                const result = await handler(data);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ result }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });

    // --- Dynamic /fetch/:url route ---
    } else if (req.method === 'GET' && req.url.startsWith('/fetch/')) {
        const targetUrlEncoded = req.url.slice('/fetch/'.length);
        const targetUrl = decodeURIComponent(targetUrlEncoded);

        console.log(`Fetching: ${targetUrl}`);

        try {
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(text);
        } catch (error) {
            console.error('Fetch error:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Error fetching URL: ${error.message}`);
        }

    // --- Serve static files ---
    } else {
        let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
        const extname = path.extname(filePath);

        let contentType = 'text/html';
        switch (extname) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpg'; break;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end('Server Error: ' + err.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});