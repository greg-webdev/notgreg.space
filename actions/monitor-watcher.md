# Monitor watcher

This Node.js script scans files in the repo and generates `actions/monitor-data.json` which the in-browser monitor page can read to show "what changed" on your site.

Quick start:

1. Install deps: `npm install` (this will install chokidar and minimist)
2. Run a one-off scan: `npm run scan`
3. Or keep watching for changes:
   - `npm run monitor` (keeps running)
   - On Windows, you can create a Task Scheduler job to run at intervals or run the script permanently.

Notes:
- The watcher excludes `.git`, `node_modules`, `.github`, and the output file `actions/monitor-data.json`.
- The watcher stores a small snapshot of file contents (up to 100k). The browser monitor uses those snapshots to compute diffs.
- Serve your site locally (e.g., using a static server) so that `actions/monitor.html` can fetch `actions/monitor-data.json`.

## Live server (optional)
If you want the browser
 to fetch the scan *live* from your PC (so you don't have to commit `monitor-data.json`), run the built-in monitor server:

```bash
npm run serve-monitor
```

This starts a small HTTP server on port 50123 (configurable via `MONITOR_PORT`) and exposes:

- `GET /monitor-data.json` — the latest report (CORS enabled)
- `POST /scan` — trigger a one-off scan (runs the watcher script once)

The browser UI will try to use `http://localhost:50123` automatically and falls back to `actions/monitor-data.json` if the server isn't running.
