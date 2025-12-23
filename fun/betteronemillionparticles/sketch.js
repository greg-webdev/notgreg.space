// Better 1 Million Particles - optimized pixel blit
let particles, colorArr;
let particleCount = 200000; // default (safe)
let maxCount = 1000000;
let running = true;
let canvas, ctx, imgData, w, h, prevW, prevH;
let mouseX = -1, mouseY = -1;
let mouseRadius = 80;
let fpsEl, particlesEl, fps=0;
let rawCanvas;
let debugOverlay, normalizeBtn; // debug UI elements
let lastTime = performance.now(), frameCount = 0;

function setup(){
  const root = document.getElementById('canvasRoot');
  canvas = createCanvas(Math.min(1200, innerWidth-60), Math.min(800, innerHeight-200));
  canvas.parent(root);
  pixelDensity(1);
  // Ensure we operate on the underlying HTMLCanvasElement (p5 may wrap it)
  rawCanvas = (canvas && canvas.elt) ? canvas.elt : canvas;
  // Request willReadFrequently for better getImageData performance on heavy workloads
  ctx = rawCanvas.getContext('2d', { willReadFrequently: true });
  w = rawCanvas.width; h = rawCanvas.height;
  prevW = w; prevH = h;
  // Create an empty ImageData for drawing
  imgData = ctx.createImageData(w,h);

  fpsEl = document.getElementById('fps'); particlesEl = document.getElementById('particles');

  // Debug overlay
  debugOverlay = document.createElement('div');
  debugOverlay.style.position = 'fixed'; debugOverlay.style.left='12px'; debugOverlay.style.top='12px';
  debugOverlay.style.padding='6px 8px'; debugOverlay.style.background='rgba(0,0,0,0.6)'; debugOverlay.style.color='#dbeafe';
  debugOverlay.style.fontFamily='monospace'; debugOverlay.style.fontSize='12px'; debugOverlay.style.borderRadius='6px';
  document.body.appendChild(debugOverlay);

  normalizeBtn = document.createElement('button');
  normalizeBtn.textContent='Normalize Positions';
  normalizeBtn.style.marginLeft='8px'; normalizeBtn.style.padding='4px 6px'; normalizeBtn.style.fontSize='12px';
  normalizeBtn.addEventListener('click', ()=>{ normalizeParticles(); });
  debugOverlay.appendChild(normalizeBtn);

  // UI
  const range = document.getElementById('countRange');
  const countLabel = document.getElementById('countLabel');
  range.value = particleCount; countLabel.innerText = particleCount;
  range.addEventListener('input', ()=>{ particleCount = Math.max(1000, +range.value); countLabel.innerText = particleCount; rebuildParticles(); });

  document.getElementById('toggleBtn').addEventListener('click', ()=>{ running = !running; document.getElementById('toggleBtn').innerText = running? 'Pause':'Resume'; });
  document.getElementById('resetBtn').addEventListener('click', ()=>{ rebuildParticles(); });
  document.getElementById('saveBtn').addEventListener('click', ()=>{ const a=document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'particles-'+Date.now()+'.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); });

  rawCanvas.addEventListener('pointermove', (e)=>{ const r=rawCanvas.getBoundingClientRect(); mouseX = (e.clientX - r.left) * (rawCanvas.width / r.width); mouseY = (e.clientY - r.top) * (rawCanvas.height / r.height); });
  rawCanvas.addEventListener('pointerleave', ()=>{ mouseX = -1; mouseY = -1; });

  // colors
  const cols = ['#91c5bf','#293847','#f9f6dd','#f07a45','#51827f'];
  colorArr = new Uint8ClampedArray(cols.length*4);
  for(let i=0;i<cols.length;i++){ const c = hexToRgb(cols[i]); colorArr[i*4]=c.r; colorArr[i*4+1]=c.g; colorArr[i*4+2]=c.b; colorArr[i*4+3]=255; }

  rebuildParticles();
  requestAnimationFrame(loop);
}

function rebuildParticles(){
  particles = new Float32Array(particleCount*4); // x,y,vx,vy
  for(let i=0;i<particleCount;i++){ const idx=i*4; particles[idx]=Math.random()*w; particles[idx+1]=Math.random()*h; particles[idx+2]=0; particles[idx+3]=0; }
  particlesEl.innerText = particleCount;
  normalizeParticles();
}

function normalizeParticles(){
  if(!particles) return;
  for(let i=0;i<particleCount;i++){ const idx=i*4; let x=particles[idx], y=particles[idx+1];
    if(!isFinite(x) || !isFinite(y) || isNaN(x) || isNaN(y)){
      particles[idx] = Math.random()*w; particles[idx+1] = Math.random()*h; particles[idx+2]=0; particles[idx+3]=0; continue;
    }
    // wrap/clamp
    if(x < 0 || x >= w) particles[idx] = Math.max(0, Math.min(w-1, x));
    if(y < 0 || y >= h) particles[idx+1] = Math.max(0, Math.min(h-1, y));
  }
}

function loop(){
  if(running){
    // clear buffer
    imgData.data.fill(8); // dark background

    // update particles
    for(let i=0;i<particleCount;i++){
      const idx = i*4; let x=particles[idx], y=particles[idx+1]; let vx=particles[idx+2], vy=particles[idx+3];
      if(mouseX>=0){ const dx = x-mouseX, dy=y-mouseY; const d2 = dx*dx+dy*dy; if(d2<mouseRadius*mouseRadius && d2>0){ const d=Math.sqrt(d2); const f=(1-d/mouseRadius)*2; vx += (dx/d)*f; vy += (dy/d)*f; } }
      x += vx; y += vy; vx *= 0.96; vy *= 0.96;
      if(x<0||x>=w){ x = Math.max(0,Math.min(w-1,x)); vx*=-1; }
      if(y<0||y>=h){ y = Math.max(0,Math.min(h-1,y)); vy*=-1; }
      particles[idx]=x; particles[idx+1]=y; particles[idx+2]=vx; particles[idx+3]=vy;

      const px = (x|0), py = (y|0);
      if(px<0 || px>=w || py<0 || py>=h) continue;
      const colIndex = (i%5)*4; // simple color cycle
      const pidx = (py*w + px)*4;
      imgData.data[pidx] = colorArr[colIndex];
      imgData.data[pidx+1] = colorArr[colIndex+1];
      imgData.data[pidx+2] = colorArr[colIndex+2];
      imgData.data[pidx+3] = 255;
    }

    ctx.putImageData(imgData,0,0);
  }

  // fps
  frameCount++; const now = performance.now(); if(now-lastTime>500){ fps = Math.round((frameCount*1000)/(now-lastTime)); frameCount=0; lastTime = now; fpsEl.innerText = fps; }

  requestAnimationFrame(loop);
}

function hexToRgb(hex){ const m = hex.replace('#',''); const r=parseInt(m.substring(0,2),16); const g=parseInt(m.substring(2,4),16); const b=parseInt(m.substring(4,6),16); return {r,g,b}; }

window.addEventListener('load', setup);
window.addEventListener('resize', ()=>{
  if(canvas){
    const newW = Math.min(1200, innerWidth-60);
    const newH = Math.min(800, innerHeight-200);
    const scaleX = (w>0) ? (newW / w) : 1;
    const scaleY = (h>0) ? (newH / h) : 1;
    canvas.width = newW; canvas.height = newH;
    // scale particle positions to preserve layout
    if(particles && particles.length) for(let i=0;i<particleCount;i++){ const idx=i*4; particles[idx]*=scaleX; particles[idx+1]*=scaleY; }
    w = canvas.width; h = canvas.height; prevW = w; prevH = h;
    imgData = ctx.createImageData(w,h);
  }
});