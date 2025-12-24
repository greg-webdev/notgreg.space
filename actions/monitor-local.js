/* Local scan viewer script: only reads actions/monitor-data.json and displays sites (no external checks) */
const SITE_DOMAIN = 'https://notgreg.space';

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
    d.innerHTML = `<div><strong>${s.name}</strong> <span style="color:#666">${s.latestMtime||''}</span> <span style="color:#666">(${s.count} files)</span> <a href="${SITE_DOMAIN}/${encodeURIComponent(s.name)}/" target="_blank" rel="noopener">Open site</a></div>`;
    list.appendChild(d);
  });
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
document.addEventListener('fullscreenchange', updateFullscreenButton);

// init
updateFullscreenButton();
fetchLocalData();