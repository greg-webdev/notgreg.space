#!/usr/bin/env node
/*
 Simple file watcher for site changes.
 - Scans a directory (default: repository root) and writes actions/monitor-data.json
 - Use --watch to keep running and update on file changes
 - Excludes common folders like .git, node_modules, and the actions/monitor-data.json itself
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');

const argv = require('minimist')(process.argv.slice(2));
const WATCH_ROOT = path.resolve(argv._[0] || process.cwd());
const OUT_FILE = path.join(WATCH_ROOT, 'actions', 'monitor-data.json');
const EXCLUDE = ['.git', 'node_modules', '.github', '.vscode', 'actions/monitor-data.json', 'mc2'];
const MAX_SNAPSHOT = 100000; // bytes to keep in snapshot

function log(...a){ console.log('[watcher]', ...a); }

function isExcluded(p){
  if(!p) return true;
  for(const ex of EXCLUDE){ if(p.includes(ex)) return true; }
  return false;
}

function sha1(s){ return crypto.createHash('sha1').update(s).digest('hex'); }

function loadData(){
  try{ return JSON.parse(fs.readFileSync(OUT_FILE,'utf8')); }catch(e){ return {generatedAt:null, files:{}}; }
}

function saveData(d){
  d.generatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT_FILE), {recursive:true});
  fs.writeFileSync(OUT_FILE, JSON.stringify(d,null,2), 'utf8');
}

function readFileSafe(fp){
  try{ return fs.readFileSync(fp,'utf8'); }catch(e){ return null; }
}

function snapshot(filePath){
  const txt = readFileSafe(filePath);
  if(txt === null) return null;
  let mtime = null;
  try{ mtime = fs.statSync(filePath).mtime.toISOString(); }catch(e){ mtime = null; }
  const s = txt.slice(0, MAX_SNAPSHOT);
  const hash = sha1(txt);
  const size = Buffer.byteLength(txt,'utf8');
  return {snapshot: s, hash, size, mtime};
}

function updateFile(data, relPath, force=false){
  const abs = path.join(WATCH_ROOT, relPath);
  // skip top-level files (we only track files inside folders)
  if(!relPath.includes('/')) return;
  if(isExcluded(relPath)) return;
  const snap = snapshot(abs);
  const ts = new Date().toISOString();
  const files = data.files = data.files || {};
  const entry = files[relPath] = files[relPath] || {latest:null, history:[]};
  if(!snap){
    // file deleted
    entry.history.push({timestamp:ts, deleted:true});
    entry.latest = {timestamp:ts, deleted:true, mtime: null};
    log('deleted', relPath);
  } else {
    const prevLatest = entry.latest || {};
    if(!prevLatest.hash || prevLatest.hash !== snap.hash){
      const h = {timestamp:ts, mtime: snap.mtime, hash:snap.hash, size:snap.size, snapshot:snap.snapshot, prevSnapshot: prevLatest.snapshot || null};
      entry.history = entry.history || [];
      entry.history.push(h);
      entry.latest = {timestamp:ts, mtime: snap.mtime, hash:snap.hash, size:snap.size};
      log('updated', relPath);
    } else {
      // update mtime even if content did not change so we can show accurate 'last modified' times
      entry.latest = Object.assign(entry.latest || {}, {mtime: snap.mtime});
      if(force) entry.latest.timestamp = ts; // optionally mark scan time
      log('unchanged (mtime updated)', relPath);
    }
  }
}

function scanOnce(){
  log('scanning', WATCH_ROOT);
  const data = loadData();
  function walk(dir){
    const list = fs.readdirSync(dir, {withFileTypes:true});
    for(const it of list){
      const abs = path.join(dir, it.name);
      const rel = path.relative(WATCH_ROOT, abs).replace(/\\/g,'/');
      if(it.isDirectory()){
        if(isExcluded(rel)) continue;
        walk(abs);
      } else if(it.isFile()){
        // skip top-level files (we only track files inside folders)
        if(!rel.includes('/')) continue;
        if(isExcluded(rel)) continue;
        updateFile(data, rel, true);
      }
    }
  }
  walk(WATCH_ROOT);
  saveData(data);
}

function startWatch(){
  log('start watching', WATCH_ROOT);
  const data = loadData();
  const watcher = chokidar.watch(WATCH_ROOT, {ignored: (p)=>isExcluded(path.relative(WATCH_ROOT,p).replace(/\\/g,'/')), persistent:true, ignoreInitial:false});

  watcher.on('add', p=>{
    const rel = path.relative(WATCH_ROOT,p).replace(/\\/g,'/');
    if(!rel.includes('/')) return;
    if(isExcluded(rel)) return;
    updateFile(data, rel, false); saveData(data);
  });
  watcher.on('change', p=>{
    const rel = path.relative(WATCH_ROOT,p).replace(/\\/g,'/');
    if(!rel.includes('/')) return;
    if(isExcluded(rel)) return;
    updateFile(data, rel, false); saveData(data);
  });
  watcher.on('unlink', p=>{
    const rel = path.relative(WATCH_ROOT,p).replace(/\\/g,'/');
    if(!rel.includes('/')) return;
    if(isExcluded(rel)) return;
    updateFile(data, rel, false); saveData(data);
  });

  log('watcher running — output:', OUT_FILE);
}

function main(){
  if(argv.watch) return startWatch();
  scanOnce();
  log('scan done — output:', OUT_FILE);
}

main();
