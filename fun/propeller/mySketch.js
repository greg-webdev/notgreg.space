
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

function setup() {
	//Block 2
	new Canvas(1000, 1000);

	propeller = new Sprite();
	propeller.width = 450;
	propeller.height = 16;
	propeller.collider = "kinematic";
	propeller.rotationSpeed = 25;
	propeller.color = "#f2a90c";
	propeller.x = width/2;
	propeller.y = height/2;

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
	fpsLabel.style('fontSize', '13px');
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
		// Update FPS (smoothed)
		const instFps = (typeof deltaTime === 'number' && deltaTime > 0) ? 1000 / deltaTime : 0;
		fpsSmoothed = fpsSmoothed * 0.9 + instFps * 0.1;
		if (typeof fpsLabel !== 'undefined') fpsLabel.html('FPS: ' + Math.round(fpsSmoothed));
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



