
let propeller;
let lengthSlider, speedSlider;
let lengthLabel, speedLabel;

// Autoclicker state
let autoClicking = false;
let autoIntervalId = null;
let autoRateSlider, autoRateLabel, autoToggleBtn;

// FPS display (smoothed)
let fpsLabel;
let fpsSmoothed = 60;
let fpsBar; // visual bar element
let frameTick = 0; // counts frames for the separate FPS updater
let lastDrawTime = performance.now();
let fpsUpdaterId = null;
let fpsBarSmoothed = 60; // independent smoothing for the visual bar
let fpsBarMin = 15; // minimum FPS mapped to 0%
let fpsBarMax = 60; // maximum FPS mapped to 100%

function setup() {
	//Block 2
	// Ask the user whether they're on mobile or desktop and persist choice
	let device = localStorage.getItem('propellerDevice');
	if (!device) {
		const isMobile = confirm('Are you on a mobile device? Press OK for Mobile, Cancel for Desktop.');
		device = isMobile ? 'mobile' : 'desktop';
		localStorage.setItem('propellerDevice', device);
	}

	const canvasWidth = device === 'mobile' ? 1000 : 1000;
	const canvasHeight = device === 'desktop' ? 1000 : 1000;

	new Canvas(canvasWidth, canvasHeight);

	propeller = new Sprite();
	propeller.width = device === 'mobile' ? 300 : 450;
	propeller.height = 16;
	propeller.collider = "kinematic";
	propeller.rotationSpeed = 25;
	propeller.color = "#f2a90c";
	propeller.x = width/2;
	propeller.y = height/2;

	// Optional change device button
	if (typeof createButton === 'function') {
		const changeBtn = createButton('Change Device');
		changeBtn.position(340, 16);
		changeBtn.mousePressed(()=>{ localStorage.removeItem('propellerDevice'); location.reload(); });
		changeBtn.style('padding','6px 10px');
	}


	// UI sliders
	lengthSlider = createSlider(50, 800, 450, 1);
	lengthSlider.position(16, 16);
	lengthSlider.style('width', '300px');
	lengthLabel = createP('Length: ' + lengthSlider.value());
	lengthLabel.position(20, 12);
	lengthLabel.style('color', '#000000ff');

	speedSlider = createSlider(0, 100, 25, 1); // range: 0..500, no negatives
	speedSlider.position(16, 78);
	speedSlider.style('width', '300px');
	speedLabel = createP('Speed: ' + speedSlider.value());
	speedLabel.position(20, 78);
	speedLabel.style('color', '#000000ff');

	// Autoclicker UI
	autoToggleBtn = createButton('Press a to turn on Autoclicker (Or click)');
	autoToggleBtn.position(16, 140);
	autoToggleBtn.mousePressed(()=>{
		if(autoClicking) stopAutoClick(); else startAutoClick();
	});
	autoToggleBtn.style('padding','6px 10px');
	autoToggleBtn.style('background','#111827');
	autoToggleBtn.style('color','#fff');

	autoRateSlider = createSlider(1, 1000, 200, 1); // ms
	autoRateSlider.position(16, 170);
	autoRateSlider.style('width','300px');
	autoRateLabel = createP('Auto rate: ' + autoRateSlider.value() + ' ms');
	autoRateLabel.position(20, 170);
	autoRateLabel.style('color','#000000ff');
	autoRateSlider.input(()=>{
		autoRateLabel.html('Auto rate: ' + autoRateSlider.value() + ' ms');
		if(autoClicking) restartAutoClick();
	});

	// FPS label
	fpsLabel = createP('FPS: --');
	fpsLabel.position(16, 230);
	fpsLabel.style('color', '#00ff40ff');
	fpsLabel.style('fontFamily', 'monospace');
	fpsLabel.style('fontSize', '13px');	// FPS bar container
	const fpsContainer = createDiv();
	fpsContainer.position(16, 258);
	fpsContainer.style('width','300px');
	fpsContainer.style('height','10px');
	fpsContainer.style('background','#222');
	fpsContainer.style('border','1px solid #333');
	fpsContainer.style('borderRadius','6px');
	fpsContainer.style('overflow','hidden');
	fpsBar = createDiv();
	fpsBar.parent(fpsContainer);
	// Use transform scaleX for GPU-accelerated animation
	fpsBar.style('width','100%');
	fpsBar.style('height','100%');
	fpsBar.style('transform-origin','left');
	fpsBar.style('transform','scaleX(0)');
	fpsBar.style('background','linear-gradient(90deg,#10b981,#84cc16)');
	fpsBar.style('transition','transform 120ms linear');
	fpsBar.addClass('fps-bar');

	// Start the independent FPS UI updater so the bar can remain responsive
	startFpsUIUpdater();
	// Ensure we clean up when leaving the page
	window.addEventListener('beforeunload', ()=>{ if(fpsUpdaterId) clearInterval(fpsUpdaterId); });
}

function draw() {
	//Block 1
	clear();
	background("#c46ad4");

	// Update propeller from UI
	if (propeller) {
		propeller.width = lengthSlider.value();
		propeller.rotationSpeed = speedSlider.value();
		lengthLabel.html('Length: ' + lengthSlider.value());
		speedLabel.html('Speed: ' + speedSlider.value());

		// Apply rotation (degrees per second)
		propeller.rotation += propeller.rotationSpeed * (deltaTime / 1000);
		// Update FPS (smoothed) — numeric label only. The visual bar is updated by a separate updater to remain responsive.
		const instFps = (typeof deltaTime === 'number' && deltaTime > 0) ? 1000 / deltaTime : 0;
		fpsSmoothed = fpsSmoothed * 0.9 + instFps * 0.1;
		if (typeof fpsLabel !== 'undefined') fpsLabel.html('FPS: ' + Math.round(fpsSmoothed));

		// Increment frame tick and record time for the independent updater
		frameTick++;
		lastDrawTime = performance.now();
	}

	// Creates a new ball every time the mouse is clicked (or by autoclicker)
	if (mouse.presses()) {
		createBallAt(mouse.x, mouse.y);
	}
}

function keyPressed() {
	if (key === 's' || key === 'S') {
		saveCanvas('propeller-' + Date.now(), 'png');
	} else if (key === 'a' || key === 'A') {
		// Toggle autoclicker via keyboard
		if (autoClicking) stopAutoClick(); else startAutoClick();
	}
}

// Helper to create a ball at given coords (safe defaults)
function createBallAt(x, y) {
	const bx = (typeof x === 'number' && isFinite(x)) ? x : width / 2;
	const by = (typeof y === 'number' && isFinite(y)) ? y : height / 2;
	let ball = new Sprite();
	ball.diameter = 10;
	ball.color = "white";
	ball.x = bx;
	ball.y = by;
}

// Independent UI updater to keep FPS bar responsive
function startFpsUIUpdater() {
	let lastUpdate = performance.now();
	fpsUpdaterId = setInterval(() => {
		const now = performance.now();
		const elapsed = now - lastUpdate;
		if (elapsed <= 0) return;
		const measured = (frameTick > 0) ? (frameTick / (elapsed / 1000)) : 0;
		frameTick = 0;
		lastUpdate = now;

		// Smooth the measured FPS for nicer visual updates
		fpsBarSmoothed = fpsBarSmoothed * 0.85 + measured * 0.15;

		// Update visual bar using GPU-accelerated transform (scaleX)
		// Map the visual range to a limited FPS band (fpsBarMin..fpsBarMax)
		let pct = (fpsBarSmoothed - fpsBarMin) / (fpsBarMax - fpsBarMin);
		pct = Math.max(0, Math.min(1, pct));
		if (typeof fpsBar !== 'undefined') {
			fpsBar.style('transform', 'scaleX(' + pct + ')');
			// Color thresholds: green >=50, yellow >=30, red below
			if (fpsBarSmoothed >= 50) fpsBar.style('background','linear-gradient(90deg,#10b981,#84cc16)');
			else if (fpsBarSmoothed >= 30) fpsBar.style('background','linear-gradient(90deg,#f59e0b,#f97316)');
			else fpsBar.style('background','linear-gradient(90deg,#ef4444,#dc2626)');

			// If main draw hasn't run in a while, show a compositor-driven visual pulse
			if (now - lastDrawTime > 500) {
				fpsBar.addClass('fps-stalled');
			} else {
				fpsBar.removeClass('fps-stalled');
			}
		}

		// Also update label if draw has been quiet
		if (typeof fpsLabel !== 'undefined') fpsLabel.html('FPS: ' + Math.round(fpsBarSmoothed));
	}, 150); // Update UI ~6-7 times per second to reduce overhead
}
function startAutoClick() {
	if (autoClicking) return;
	autoClicking = true;
	autoToggleBtn.html('Press a to turn off Autoclicker (Or click)');
	autoIntervalId = setInterval(() => {
		createBallAt(mouse.x, mouse.y);
	}, autoRateSlider.value());
}

function stopAutoClick() {
	if (!autoClicking) return;
	autoClicking = false;
	autoToggleBtn.html('Press a to turn on Autoclicker (Or click)');
	if (autoIntervalId) { clearInterval(autoIntervalId); autoIntervalId = null; }
}

function restartAutoClick() {
	if (!autoClicking) return;
	if (autoIntervalId) clearInterval(autoIntervalId);
	autoIntervalId = setInterval(() => { createBallAt(mouse.x, mouse.y); }, autoRateSlider.value());
}



