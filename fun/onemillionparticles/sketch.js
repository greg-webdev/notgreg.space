const particleCount = 1000000;
const colors = [
    "#91c5bf",
    "#293847",
    "#f9f6dd",
    "#f07a45",
    "#51827f",
];
const mouseRadius = 100;
const repelForce = 0.5;
const particles = new Float32Array(particleCount * 5); // x, y, vx, vy, colorIndex
const colorArray = new Uint32Array(colors.length); // Precomputed RGBA colors

function setup() {
    createCanvas(700, 700);
    pixelDensity(1)
    // Precompute colors as 32-bit RGBA values
    for (let i = 0; i < colors.length; i++) {
        const c = color(colors[i]);
        colorArray[i] = (255 << 24) | (c.levels[0] << 16) | (c.levels[1] << 8) | c.levels[2];
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        const x = random(width);
        const y = random(height);
        const idx = i * 5;
        particles[idx] = x;        // x position
        particles[idx + 1] = y;    // y position
        particles[idx + 2] = 0;    // vx (velocity x)
        particles[idx + 3] = 0;    // vy (velocity y)

        // Assign a noise-based color
        const noiseValue = noise(x * 0.0081, y * 0.0081);
        const colorIndex = floor(noiseValue * colorArray.length);
        particles[idx + 4] = colorIndex;
    }
}

function draw() {
    background('#242829');
    loadPixels();
    const width = canvas.width;
    const height = canvas.height;
    const radiusSq = mouseRadius * mouseRadius;

    for (let i = 0; i < particleCount; i++) {
        const idx = i * 5;
        let px = particles[idx];
        let py = particles[idx + 1];
        let vx = particles[idx + 2];
        let vy = particles[idx + 3];

        if (mouseX >= 0 && mouseY >= 0) {
            const dx = px - mouseX;
            const dy = py - mouseY;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < radiusSq && distanceSq > 0) {
                const distance = sqrt(distanceSq);
                const effectStrength = (1 - distance / mouseRadius) * repelForce;
                vx += (dx / distance) * effectStrength;
                vy += (dy / distance) * effectStrength;
            }
        }

        // Update particle position based on velocity
        px += vx;
        py += vy;
        vx *= 0.98;
        vy *= 0.98;

        // Bounce off walls
        if (px < 0 || px >= width) vx *= -1;
        if (py < 0 || py >= height) vy *= -1;

        // Update particle array
        particles[idx] = px;
        particles[idx + 1] = py;
        particles[idx + 2] = vx;
        particles[idx + 3] = vy;

        // Draw particle
        const x = floor(px);
        const y = floor(py);
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const colorIndex = particles[idx + 4];
            const colorValue = colorArray[colorIndex];
            const pixelIndex = (y * width + x) * 4;
            pixels[pixelIndex + 0] = (colorValue >> 16) & 255; // Red
            pixels[pixelIndex + 1] = (colorValue >> 8) & 255;  // Green
            pixels[pixelIndex + 2] = colorValue & 255;         // Blue
            pixels[pixelIndex + 3] = 255;                      // Alpha
        }
    }

    updatePixels();
}