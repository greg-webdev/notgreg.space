// Simple site monitor that stores data in localStorage
// Storage keys: 'siteMonitor_sites' = array of {id,url,intervalSec,useProxy,lastChecked,history:[events]}

const STORAGE_KEY = 'siteMonitor_sites_v1';
let sites = [];
let timers = {};

const defaultProxy = 'https://api.allorigins.win/raw?url='; // useful for CORS
const SITE_DOMAIN = 'https://notgreg.space'; // domain to link top-level sites to
function getProxyHost(){ const e = document.getElementById('defaultProxy'); return e && e.value.trim() ? e.value.trim() : defaultProxy; }

function uid(){ return Math.random().toString(36).slice(2,9); }

function load(){
  try{ sites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ sites = []; }
  sites.forEach(s => { if(!s.id) s.id = uid(); });
  save();
}

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(sites)); }

function render(){
  const el = document.getElementById('sitesList'); el.innerHTML = '';
  if(!sites.length){ el.innerHTML = '<p>No sites yet.</p>'; return; }
  sites.forEach(s => {
    const div = document.createElement('div'); div.className='site';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${s.url}</strong><div class="meta">Interval: ${s.intervalSec}s · Last: ${s.lastChecked||'never'}</div>`;
    div.appendChild(left);
    const btns = document.createElement('div'); btns.className='buttons';
    const checkBtn = document.createElement('button'); checkBtn.textContent='Check now'; checkBtn.onclick = ()=>checkSite(s.id);
    const histBtn = document.createElement('button'); histBtn.textContent='History'; histBtn.onclick = ()=>showHistory(s.id);
    const delBtn = document.createElement('button'); delBtn.textContent='Remove'; delBtn.onclick = ()=>removeSite(s.id);
    btns.append(checkBtn,histBtn,delBtn);
    div.appendChild(btns);
    el.appendChild(div);
  });
}

function addSite(url, intervalSec=60, useProxy=false){
  const site = { id:uid(), url, intervalSec, useProxy, lastChecked:null, history:[] };
  sites.push(site); save(); render(); schedule(site.id);
}

function removeSite(id){
  stopTimer(id);
  sites = sites.filter(s=>s.id!==id); save(); render();
}

function startAll(){ sites.forEach(s=>schedule(s.id)); }
function stopAll(){ Object.keys(timers).forEach(stopTimer); }

function schedule(id){
  const s = sites.find(x=>x.id===id); if(!s) return;
  stopTimer(id);
  // do an immediate check then schedule
  checkSite(id);
  timers[id] = setInterval(()=>checkSite(id), (s.intervalSec||60)*1000);
}

function stopTimer(id){ if(timers[id]){ clearInterval(timers[id]); delete timers[id]; } }

async function checkSite(id){
  const s = sites.find(x=>x.id===id); if(!s) return;
  const url = s.useProxy ? getProxyHost() + encodeURIComponent(s.url) : s.url;
  const timestamp = new Date().toISOString();
  let event = { timestamp, status: null, statusText: '', headers: {}, contentHash: '', contentLength:0, summary:'', diffHTML:'', changedResources:[], error:null };
  try{
    const r = await fetch(url, {mode:'cors'});
    event.status = r.status; event.statusText = r.statusText;
    r.headers.forEach((v,k)=> event.headers[k]=v);
    const text = await r.text();
    event.contentLength = text.length;
    event.contentHash = hash(text);
    // find resources
    try{
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img')).map(i=>i.getAttribute('src'));
      const scripts = Array.from(doc.querySelectorAll('script')).map(i=>i.getAttribute('src'));
      const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(i=>i.getAttribute('href'));
      event.changedResources = {imgs, scripts, links};
    }catch(e){ }

    // compare with last
    const last = s.history && s.history.length ? s.history[s.history.length-1] : null;
    if(!last || last.contentHash !== event.contentHash){
      // diff summary
      const oldText = last ? last._raw || '' : '';
      const diffs = Diff.diffWordsWithSpace(oldText, text);
      let added=0, removed=0;
      let diffHTML = '';
      diffs.forEach(p=>{
        if(p.added){ diffHTML += `<span class="diff-added">${escapeHtml(p.value)}</span>`; added += p.value.length; }
        else if(p.removed){ diffHTML += `<span class="diff-removed">${escapeHtml(p.value)}</span>`; removed += p.value.length; }
        else { diffHTML += `<span class="diff-context">${escapeHtml(p.value)}</span>`; }
      });
      event.summary = `Added ${added} chars, removed ${removed} chars`;
      event.diffHTML = diffHTML;
      // store a raw small preview to compute future diffs. Keep full text? store only if small
      event._raw = text.slice(0, 100000); // truncate just in case
      s.history = s.history || [];
      s.history.push(event);
      s.lastChecked = timestamp;
      save(); render();
    } else {
      // no-change event (still update lastChecked)
      s.lastChecked = timestamp; save(); render();
    }
  }catch(e){
    event.error = String(e);
    event.timestamp = timestamp;
    s.history = s.history || [];
    s.history.push(event);
    s.lastChecked = timestamp; save(); render();
  }
}

function showHistory(id){
  const s = sites.find(x=>x.id===id); if(!s) return;
  const modal = document.getElementById('historyModal');
  document.getElementById('historyTitle').textContent = `History for ${s.url}`;
  const c = document.getElementById('historyContent'); c.innerHTML = '';
  if(!s.history || !s.history.length) c.innerHTML = '<p>No history yet.</p>';
  (s.history||[]).slice().reverse().forEach(e=>{
    const box = document.createElement('div');
    box.style.borderTop = '1px solid #eee'; box.style.padding='8px 0';
    box.innerHTML = `<div><strong>${e.timestamp}</strong> ${e.status?`(${e.status} ${e.statusText})`:''} <em>${e.summary||''}</em></div>`;
    if(e.error) box.innerHTML += `<div style="color:crimson">Error: ${escapeHtml(e.error)}</div>`;
    if(e.diffHTML) box.innerHTML += `<div class="diff">${e.diffHTML}</div>`;
    if(e.changedResources) box.innerHTML += `<details><summary>Resources</summary><pre>${escapeHtml(JSON.stringify(e.changedResources,null,2))}</pre></details>`;
    c.appendChild(box);
  });
  modal.style.display='flex'; modal.setAttribute('aria-hidden','false');
}

function hash(s){ // simple hash
  let h=0; for(let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; } return (h>>>0).toString(16);
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// UI binding
document.getElementById('addForm').addEventListener('submit', e=>{
  e.preventDefault();
  const url = document.getElementById('url').value.trim();
  const interval = parseInt(document.getElementById('interval').value,10) || 60;
  const useProxy = document.getElementById('useProxy').checked;
  addSite(url, interval, useProxy);
  e.target.reset();
});

document.getElementById('closeHistory').addEventListener('click', ()=>{
  const modal = document.getElementById('historyModal'); modal.style.display='none'; modal.setAttribute('aria-hidden','true');
});

document.getElementById('checkAllBtn').addEventListener('click', ()=>{ sites.forEach(s=>checkSite(s.id)); });

document.getElementById('clearHistoryBtn').addEventListener('click', ()=>{
  if(!confirm('Clear history for all sites?')) return; sites.forEach(s=>s.history=[]); save(); render(); alert('Cleared history');
});

// export/import
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const a = document.createElement('a');
  const data = JSON.stringify(sites, null, 2);
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
  a.download = `site-monitor-history-${new Date().toISOString().slice(0,19)}.json`;
  a.click();
});

document.getElementById('importBtn').addEventListener('click', ()=>{
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return; const r = new FileReader();
  r.onload = ()=>{
    try{ const data = JSON.parse(r.result); if(Array.isArray(data)){ sites = data; save(); render(); startAll(); alert('Imported'); } }
    catch(err){ alert('Import failed: ' + err); }
  };
  r.readAsText(f);
});

// Local scan: fetch and render actions/monitor-data.json
async function fetchLocalData(){
  try{
    const res = await fetch('monitor-data.json', {cache:'no-store'});
    if(!res.ok) throw new Error('Not found');
    const data = await res.json();
    renderLocalChanges(data);
  }catch(e){
    document.getElementById('localList').innerHTML = '<p style="color:crimson">Local report not found. Run the watcher script (see actions/monitor-watcher.md).</p>';
  }
}

function renderLocalChanges(data){
  const list = document.getElementById('localList'); list.innerHTML = '';
  if(!data || !data.files) { list.innerHTML = '<p>No local data available.</p>'; return; }
  // group by top-level folder (site)
  const siteMap = {};
  Object.entries(data.files).forEach(([p,info])=>{
    // skip top-level files
    if(!p.includes('/')) return;
    const top = p.split('/')[0];
    if(top === 'mc2') return; // exclude mc2 explicitly
    siteMap[top] = siteMap[top] || {name: top, latest: null, files: []};
    if(info.latest && (!siteMap[top].latest || info.latest.timestamp > siteMap[top].latest.timestamp)){
      siteMap[top].latest = info.latest;
    }
    siteMap[top].files.push({path:p, info});
  });
  const sites = Object.values(siteMap).sort((a,b)=>{
    const ta = a.latest && a.latest.timestamp ? Date.parse(a.latest.timestamp) : 0;
    const tb = b.latest && b.latest.timestamp ? Date.parse(b.latest.timestamp) : 0;
    return tb - ta; // newest first
  });
  if(!sites.length) { list.innerHTML = '<p>No sites recorded yet.</p>'; return; }
  sites.forEach(s=>{
    const d = document.createElement('div'); d.style.borderTop='1px solid #eee'; d.style.padding='8px 0';
    d.innerHTML = `<div><strong>${s.name}</strong> <span style="color:#666">${(s.latest && s.latest.timestamp)||''}</span> <span style="color:#666">(${s.files.length} files)</span> <a href="${SITE_DOMAIN}/${encodeURIComponent(s.name)}/" target="_blank" rel="noopener">Open site</a></div>`;
    list.appendChild(d);
  });
}

function showSiteFiles(siteName, data){
  const files = Object.entries(data.files).filter(([p]) => p === siteName || p.startsWith(siteName + '/'));
  const modal = document.getElementById('historyModal');
  document.getElementById('historyTitle').textContent = `Files in ${siteName}`;
  const c = document.getElementById('historyContent'); c.innerHTML = '';
  files.forEach(([p,info])=>{
    const box = document.createElement('div'); box.style.borderTop='1px solid #eee'; box.style.padding='8px 0';
    box.innerHTML = `<div><strong>${p}</strong> <span style="color:#666">${(info.latest&&info.latest.timestamp)||''}</span></div>`;
    const btn = document.createElement('button'); btn.textContent='Show history'; btn.onclick = ()=>{ showFileHistory(p, data); };
    box.appendChild(btn);
    c.appendChild(box);
  });
  modal.style.display='flex'; modal.setAttribute('aria-hidden','false');
} 

function showFileHistory(path, data){
  const info = data.files[path]; if(!info) return alert('No data for ' + path);
  const modal = document.getElementById('historyModal');
  document.getElementById('historyTitle').textContent = `Local history: ${path}`;
  const c = document.getElementById('historyContent'); c.innerHTML = '';
  (info.history||[]).slice().reverse().forEach(e=>{
    const box = document.createElement('div'); box.style.borderTop='1px solid #eee'; box.style.padding='8px 0';
    box.innerHTML = `<div><strong>${e.timestamp}</strong> ${e.deleted?'<em style="color:crimson">deleted</em>':''}</div>`;
    if(e.snapshot){
      if(e.prevSnapshot){
        const diffs = Diff.diffWordsWithSpace(e.prevSnapshot, e.snapshot);
        let diffHTML = '';
        diffs.forEach(p=>{ if(p.added) diffHTML += `<span class="diff-added">${escapeHtml(p.value)}</span>`; else if(p.removed) diffHTML += `<span class="diff-removed">${escapeHtml(p.value)}</span>`; else diffHTML += `<span class="diff-context">${escapeHtml(p.value)}</span>`; });
        box.innerHTML += `<div class="diff">${diffHTML}</div>`;
      } else {
        box.innerHTML += `<pre>${escapeHtml(e.snapshot.slice(0,2000))}</pre>`;
      }
    }
    c.appendChild(box);
  });
  modal.style.display='flex'; modal.setAttribute('aria-hidden','false');
}

document.getElementById('refreshLocalBtn').addEventListener('click', ()=>fetchLocalData());

// init
load(); render(); startAll();
// try to fetch local data on load (silent)
fetchLocalData();
