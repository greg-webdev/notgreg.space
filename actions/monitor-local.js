/* Local scan viewer script: prefer a live server at the provided IP but fall back to local file */
const SITE_DOMAIN = 'https://notgreg.space';
const MONITOR_PORT = 50123;
// Default to the IP you provided. Change MONITOR_HOST here if you want a different address.
const MONITOR_HOST = '165.173.23.252';
const SERVER_HTTP = `http://${MONITOR_HOST}:${MONITOR_PORT}`;
const SERVER_HTTPS = `https://${MONITOR_HOST}:${MONITOR_PORT}`;
let lastFetchedData = null; let liveConnected = false;

async function fetchWithTimeout(url, timeout = 3000){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeout);
  try{ const res = await fetch(url, {cache:'no-store', signal: controller.signal}); clearTimeout(id); return res; } catch(e){ clearTimeout(id); throw e; }
}

async function tryFetchLive(){
  // Try same-protocol first. If the page is https and server only speaks http, the browser will block mixed content — in that case we display a helpful message.
  try{
    const tryUrl = (window.location.protocol === 'https:') ? SERVER_HTTPS : SERVER_HTTP;
    const res = await fetchWithTimeout(`${tryUrl}/monitor-data.json`, 1200);
    if(res && res.ok){ const data = await res.json(); liveConnected = true; showLiveStatus(true); lastFetchedData = data; renderLocalChanges(data); return true; }
  }catch(e){ /* fail */ }

  // If page is HTTPS, don't attempt an http:// access (it would be blocked by the browser). Instead, inform the user with an explicit link.
  if(window.location.protocol === 'https:'){
    liveConnected = false; showLiveStatus(false, true); return false;
  }

  // Otherwise try http as a fallback
  try{
    const res2 = await fetchWithTimeout(`${SERVER_HTTP}/monitor-data.json`, 1200);
    if(res2 && res2.ok){ const data = await res2.json(); liveConnected = true; showLiveStatus(true); lastFetchedData = data; renderLocalChanges(data); return true; }
  }catch(e){ /* not available */ }

  liveConnected = false; showLiveStatus(false);
  return false;
}

async function fetchLocalData(){
  // Try live first
  const live = await tryFetchLive();
  if(live) return;
  try{
    const res = await fetch('monitor-data.json', {cache:'no-store'});
    if(!res.ok) throw new Error('Not found');
    const data = await res.json(); lastFetchedData = data; renderLocalChanges(data);
  }catch(e){
    document.getElementById('localList').innerHTML = '<p style="color:crimson">Local report not found. Run the watcher script (see actions/monitor-watcher.md) or start the local server (see README).</p>';
  }
}

function showLiveStatus(isLive, blockedByHttps=false){
  const s = document.getElementById('liveStatus'); const btn = document.getElementById('triggerScanBtn'); const openBtn = document.getElementById('openLocalMonitorBtn');
  if(!s) return;
  if(isLive){ s.textContent = 'Connected to se4rver'; s.style.color = 'green'; if(btn) btn.style.display='inline-block'; if(openBtn) openBtn.style.display='none'; }
  else {
    if(blockedByHttps){
      s.innerHTML = `Local server reachable but blocked by browser (mixed-content). <a href="http://${MONITOR_HOST}:${MONITOR_PORT}/actions/monitor.html" target="_blank" rel="noopener">Open monitor over HTTP</a>`;
      s.style.color = 'orange'; if(btn) btn.style.display='none'; if(openBtn) { openBtn.style.display='inline-block'; }
    } else {
      s.textContent = 'No live server'; s.style.color = 'crimson'; if(btn) btn.style.display='none'; if(openBtn) openBtn.style.display='none';
    }
  }
}

function renderLocalChanges(data){
  const list = document.getElementById('localList'); list.innerHTML = '';
  if(!data || !data.files) { list.innerHTML = '<p>No local data available.</p>'; return; }
  const siteMap = {};
  Object.entries(data.files).forEach(([p,info])=>{
    // skip root files
    if(!p.includes('/')) return;
    const top = p.split('/')[0];
    if(top === 'mc2') return; // excluded
    siteMap[top] = siteMap[top] || {name: top, latestMtime: null, count:0};
    siteMap[top].count += 1;
    if(info.latest && info.latest.mtime){
      if(!siteMap[top].latestMtime || Date.parse(info.latest.mtime) > Date.parse(siteMap[top].latestMtime)){
        siteMap[top].latestMtime = info.latest.mtime;
      }
    }
  });
  const sites = Object.values(siteMap).sort((a,b)=>{
    const ta = a.latestMtime ? Date.parse(a.latestMtime) : 0;
    const tb = b.latestMtime ? Date.parse(b.latestMtime) : 0;
    return tb - ta; // newest first
  });
  if(!sites.length) { list.innerHTML = '<p>No sites recorded yet.</p>'; return; }
  sites.forEach(s=>{
    const d = document.createElement('div'); d.style.borderTop='1px solid #eee'; d.style.padding='8px 0';
    d.innerHTML = `<div><strong>${s.name}</strong> <span style=\"color:#666\">${s.latestMtime||''}</span> <span style=\"color:#666\">(${s.count} files)</span> <a href=\"${SITE_DOMAIN}/${encodeURIComponent(s.name)}/\" rel=\"noopener\">Open site</a></div>`;
    // Click the row to open the actual site (navigates away)
    d.addEventListener('click', ()=>{ window.location.href = `${SITE_DOMAIN}/${encodeURIComponent(s.name)}/`; });
    list.appendChild(d);
  });
}

async function triggerScan(){
  if(!liveConnected) return alert('No live server');
  try{
    const res = await fetch(`${SERVER_HTTP}/scan`, {method:'POST'});
    if(!res.ok) throw new Error('Scan failed');
    const json = await res.json(); alert('Scan triggered, output logged to server.');
    // refresh after a short delay
    setTimeout(()=>fetchLocalData(), 1500);
  }catch(e){ alert('Failed to trigger scan: '+e.message); }
}

function showSiteDetails(siteName, data){
  const files = Object.entries(data.files).filter(([p]) => p === siteName || p.startsWith(siteName + '/'));
  const modal = document.getElementById('historyModal');
  document.getElementById('historyTitle').textContent = `Files in ${siteName}`;
  const c = document.getElementById('historyContent'); c.innerHTML = '';
  files.forEach(([p,info])=>{
    const box = document.createElement('div'); box.style.borderTop='1px solid #eee'; box.style.padding='8px 0';
    box.innerHTML = `<div><strong>${p}</strong> <span style="color:#666">${(info.latest && info.latest.mtime)||''}</span></div>`;
    c.appendChild(box);
  });
  modal.style.display='flex'; modal.setAttribute('aria-hidden','false');
}

// UI binding
document.getElementById('refreshLocalBtn').addEventListener('click', ()=>fetchLocalData());
document.getElementById('closeHistory').addEventListener('click', ()=>{ const modal = document.getElementById('historyModal'); modal.style.display='none'; modal.setAttribute('aria-hidden','true'); });
const triggerBtn = document.getElementById('triggerScanBtn'); if(triggerBtn) triggerBtn.addEventListener('click', ()=>triggerScan());

// Fullscreen toggle
function updateFullscreenButton(){
  const btn = document.getElementById('fullscreenBtn'); if(!btn) return;
  if(document.fullscreenElement) { btn.textContent = 'Exit fullscreen'; btn.setAttribute('aria-pressed','true'); }
  else { btn.textContent = 'Enter fullscreen'; btn.setAttribute('aria-pressed','false'); }
}
function toggleFullscreen(){
  const docEl = document.documentElement;
  if(!document.fullscreenElement){
    if(docEl.requestFullscreen) docEl.requestFullscreen().catch(()=>{});
  } else {
    if(document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  }
}
const fsBtn = document.getElementById('fullscreenBtn'); if(fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
const openLocalBtn = document.getElementById('openLocalMonitorBtn'); if(openLocalBtn) openLocalBtn.addEventListener('click', ()=>{ window.open(`http://${MONITOR_HOST}:${MONITOR_PORT}/actions/monitor.html`, '_blank'); });

document.addEventListener('fullscreenchange', updateFullscreenButton);

// init
updateFullscreenButton();
fetchLocalData();