let currentY = 0;
const increment = 0.01;
let darkColor, blueColor, goldColor;
let speedSlider;
let downloadButton;
let isFinished = false;

function setup() {
    createCanvas(600, 800);
    colorMode(RGB, 255, 255, 255, 1);
    background(0);
    darkColor = color(20, 20, 40, 0.7);
    blueColor = color(0, 0, 255, 0.7);
    goldColor = color(212, 175, 55, 0.7);
    noiseDetail(8, 0.65);
    
    // Create speed slider
    speedSlider = createSlider(0, 10, 1, 0.1);
    speedSlider.position(10, 10);
    speedSlider.style('width', '200px');
}

function draw() {
    for (let x = 0; x < width; x += 1) {
        let n = noise(x * increment, currentY * increment);
        let c = lerpColor(darkColor, blueColor, n * 4);
        c = lerpColor(c, goldColor, sqrt(n * 0.5));
        fill(c);
        noStroke();
        rect(x, currentY, 10, 10);
    }
    drawStarsInRow(currentY, 1);

    currentY += speedSlider.value();

    if (currentY >= height) {
        noLoop();
        if (!isFinished) {
            createDownloadButton();
            isFinished = true;
        }
    }
}

function drawStarsInRow(y, count) {
    for (let i = 0; i < count; i++) {
        let x = random(width);
        let starSize = random(1, 3);
        fill(255, 255, 220, 3);
        noStroke();
        ellipse(x, y + random(-5, 5), starSize, starSize);
    }
}

function createDownloadButton() {
    downloadButton = createButton('Download Image');
    downloadButton.position(width / 2 - 75, height / 2);
    downloadButton.style('padding', '10px 20px');
    downloadButton.style('font-size', '16px');
    downloadButton.style('background-color', '#4CAF50');
    downloadButton.style('color', 'white');
    downloadButton.style('border', 'none');
    downloadButton.style('border-radius', '5px');
    downloadButton.style('cursor', 'pointer');
    downloadButton.mousePressed(downloadCanvas);
}

function downloadCanvas() {
    // Get canvas data as blob
    canvas.elt.toBlob(function(blob) {
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cloudyspace-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}