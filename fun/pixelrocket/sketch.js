let stars = [];
let planets = [];
let rocketX, rocketY;
let easing = 0.05;
let particles = [];
let myCanvas;


function setup() {
  myCanvas = createCanvas(450, 400);
  noCursor();
  noSmooth();
  windowResized();//Allow small Canvas sizes to be scaled to fullscreen
  rocketX = width / 2;
  rocketY = height / 2;
  textFont('Noto Color Emoji');

  for (let i = 0; i < 20; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(5, 15),
      char: random(['✨', '🌟']),
      floatSpeed: random(0.02, 0.04),
      floatDirection: random() > 0.5 ? 1 : -1,
    });
  }

  for (let i = 0; i < 2; i++) {
    planets.push({
      x: random(width),
      y: random(height),
      size: random(10, 20),
      char: random(['🪐', '🌕']),
      floatSpeed: random(0.01, 0.025),
      floatDirection: random() > 0.5 ? 1 : -1,
    });
  }
}

async function draw() {
  background(0);
  textSize(400);
  textAlign(CENTER, CENTER);
  fill(255);

  drawSpaceElements(stars);
  drawSpaceElements(planets);

  textSize(400);
  text('🌍', width / 2, height + 150);

  let dx = mouseX - rocketX;
  let dy = mouseY - rocketY;
  rocketX += dx * easing;
  rocketY += dy * easing;

  let angle = atan2(dy, dx);

  createFireTrail(rocketX, rocketY, angle);

  drawParticles();

  push();
  fill(255)
  translate(rocketX, rocketY);
  rotate(angle + QUARTER_PI);
  textSize(40);
  text('🚀', 0, 0);
  pop();

  ditheredCanvas = await pixelate({
    image: myCanvas,
    width: 200,
    dither: 'ordered',
    strength: 11,
    palette: [
      '#1b1b1e', '#f4f1de', '#e07a5f',
      '#3d405b', '#495c92', '#596da7', '#81b29a', '#f2cc8f',
      '#8d5a97', '#ef3054', '#d3d0be', '#4a7762', '#364e43',
    ],
    resolution: 'original'
  });

  image(ditheredCanvas, 0, 0, width, height);

}

function drawSpaceElements(elements) {
  elements.forEach((el) => {
    el.y += el.floatSpeed * el.floatDirection;
    if (el.y < 0 || el.y > height) el.floatDirection *= -1;

    textSize(el.size);
    text(el.char, el.x, el.y);
  });
}


function createFireTrail(x, y, angle) {
  let offsetX = cos(angle + PI / 4) * 30;
  let offsetY = sin(angle + PI / 4) * 30;

  let fireParticle = {
    x: x - offsetX / 7,
    y: y - offsetY / 4,
    size: random(2, 11),
    opacity: 255,
    speedX: random(-1, 1) / 2,
    speedY: random(-1, 1) / 2,
  };

  particles.push(fireParticle);

  if (particles.length > 50) {
    particles.splice(0, 1);
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    fill(255, random(100, 200), 0, p.opacity);
    noStroke();

    ellipse(p.x, p.y, p.size);

    p.x += p.speedX;
    p.y += p.speedY;
    p.opacity -= 5;

    if (p.opacity <= 0) {
      particles.splice(i, 1);
    }
  }
}

function windowResized() {
  // Get the window dimensions and aspect ratios
  let windowAspect = windowWidth / windowHeight;
  let canvasAspect = width / height;

  // Adjust the canvas size based on the aspect ratio
  if (canvasAspect > windowAspect) {
    // Canvas is wider relative to the window
    myCanvas.style('width', '100vw');
    myCanvas.style('height', 'auto');
  } else {
    // Canvas is taller relative to the window
    myCanvas.style('width', 'auto');
    myCanvas.style('height', '100vh');
  }
}
