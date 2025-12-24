#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Simple request logging
app.use((req, res, next) => { console.log(`[monitor-server] ${req.method} ${req.url}`); next(); });
// Serve the monitor UI from the actions folder so you can open it directly via HTTP
app.use('/actions', express.static(__dirname));

const MONITOR_PATH = path.join(__dirname, 'monitor-data.json');
const PORT = process.env.MONITOR_PORT || 50123;
// Bind to all interfaces by default so the server is reachable via port-forwarding.
// Use PUBLIC_HOST (or MONITOR_HOST) for display/links only (doesn't affect binding).
const HOST = process.env.BIND_HOST || '0.0.0.0';
const PUBLIC_HOST = process.env.PUBLIC_HOST || process.env.MONITOR_HOST || 'localhost';

app.get('/monitor-data.json', (req, res) => {
  fs.readFile(MONITOR_PATH, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'monitor-data.json not found' });
    res.set('Content-Type', 'application/json');
    res.send(data);
  });
});

app.get('/status', (req, res) => {
  fs.stat(MONITOR_PATH, (err, st) => {
    if (err) return res.json({ exists: false });
    res.json({ exists: true, mtime: st.mtime });
  });
});

app.post('/scan', (req, res) => {
  // Run a one-off scan by executing the watcher script (no --watch)
  const watcher = spawn(process.execPath, [path.join(__dirname, 'monitor-watcher.js')], { cwd: __dirname });
  let out = '';
  watcher.stdout.on('data', (d) => { out += d.toString(); });
  watcher.stderr.on('data', (d) => { out += d.toString(); });
  watcher.on('close', (code) => {
    res.json({ status: 'done', code, output: out });
  });
  watcher.on('error', (err) => {
    res.status(500).json({ status: 'error', message: err.message });
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[monitor-server] Listening on http://${PUBLIC_HOST}:${PORT} (bound on ${HOST})`);
  console.log(`[monitor-server] GET /monitor-data.json  POST /scan`);
});
