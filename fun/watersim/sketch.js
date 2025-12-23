// Sand simulator with material chooser
const particleCount = 1000000;
const mouseRadius = 50;
const repelForce = 0.5;
const gravity = 0.2;

// Materials: [name, color, viscosity, bounce, friction, flowRate, density]
const materials = [
    ['Sand', '#C2B280', 0.85, 0.2, 0.95, 0.5, 1.0],    // Medium flow, high density
    ['Water', '#4A90E2', 0.95, 0.1, 0.9, 1.0, 0.8],    // High flow, low density
    ['Stone', '#808080', 0.7, 0.5, 0.98, 0.1, 1.5],    // Low flow, very high density
    ['Fire', '#FF4500', 0.9, 0.3, 0.85, 0.8, 0.3],     // High flow, very low density
    ['Snow', '#FFFAFA', 0.88, 0.15, 0.92, 0.6, 0.7],   // Medium flow, low density
];

let selectedMaterial = 0;
let particles = new Float32Array(particleCount * 6); // x, y, vx, vy, materialIndex, colorIndex
let materialColors = [];
let colorArray = [];
let particleCountActive = 0; // Track how many particles are active

function setup() {
    createCanvas(700, 500);
    pixelDensity(1);
    
    // Precompute material colors
    for (let i = 0; i < materials.length; i++) {
        const c = color(materials[i][1]);
        materialColors.push([
            (255 << 24) | (c.levels[0] << 16) | (c.levels[1] << 8) | c.levels[2],
            c.levels[0],
            c.levels[1],
            c.levels[2]
        ]);
    }
    
    // Create material selector buttons
    createMaterialSelector();
    
    // Create clear button
    createClearButton();
    
    // Initialize all particles as inactive
    // Use a value that's clearly invalid (like -999) to mark inactive particles
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 6;
        particles[idx] = -999; // Mark as inactive with invalid position
        particles[idx + 1] = -999;
        particles[idx + 2] = 0;
        particles[idx + 3] = 0;
        particles[idx + 4] = -1; // -1 means inactive
    }
    
    console.log('Setup complete. Particle count:', particleCount);
}

let materialButtons = [];

function createMaterialSelector() {
    const buttonWidth = 120;
    const buttonHeight = 40;
    const startX = width - buttonWidth - 10;
    const startY = 10;
    const spacing = 50;
    
    for (let i = 0; i < materials.length; i++) {
        const btn = createButton(materials[i][0]);
        btn.position(startX, startY + i * spacing);
        btn.size(buttonWidth, buttonHeight);
        btn.elt.style.backgroundColor = materials[i][1];
        btn.elt.style.color = '#000';
        btn.elt.style.border = '2px solid #fff';
        btn.elt.style.fontSize = '14px';
        btn.elt.style.fontWeight = 'bold';
        btn.elt.style.cursor = 'pointer';
        
        materialButtons.push(btn);
        
        // Use closure to capture i
        (function(index) {
            btn.mousePressed(function() {
                selectedMaterial = index;
                updateButtonStyles();
                console.log('Selected material:', materials[index][0]);
            });
        })(i);
    }
    updateButtonStyles();
}

function updateButtonStyles() {
    for (let i = 0; i < materialButtons.length; i++) {
        if (i === selectedMaterial) {
            materialButtons[i].elt.style.border = '3px solid #FFD700';
            materialButtons[i].elt.style.boxShadow = '0 0 10px #FFD700';
        } else {
            materialButtons[i].elt.style.border = '2px solid #fff';
            materialButtons[i].elt.style.boxShadow = 'none';
        }
    }
}

let clearButton;

function createClearButton() {
    clearButton = createButton('Clear');
    clearButton.position(width - 130, height - 80);
    clearButton.size(120, 40);
    clearButton.elt.style.backgroundColor = '#FF4444';
    clearButton.elt.style.color = '#fff';
    clearButton.elt.style.border = '2px solid #fff';
    clearButton.elt.style.fontSize = '14px';
    clearButton.elt.style.fontWeight = 'bold';
    clearButton.elt.style.cursor = 'pointer';
    clearButton.mousePressed(clearAllParticles);
}

function clearAllParticles() {
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 6;
        particles[idx] = -999;
        particles[idx + 1] = -999;
        particles[idx + 2] = 0;
        particles[idx + 3] = 0;
        particles[idx + 4] = -1;
    }
    particleCountActive = 0;
    console.log('Cleared all particles');
}

function draw() {
    background('#1a1a1a');
    loadPixels();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const radiusSq = mouseRadius * mouseRadius;
    
    // Build occupancy grid and material grid for collision detection (1 pixel = 1 cell)
    const occupancyGrid = new Uint8Array(canvasWidth * canvasHeight);
    const materialGrid = new Int8Array(canvasWidth * canvasHeight); // Store material index at each position
    
    // First pass: mark all current particle positions and their materials
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 6;
        const materialIdx = particles[idx + 4];
        if (materialIdx < 0) continue;
        
        const x = floor(particles[idx]);
        const y = floor(particles[idx + 1]);
        if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
            const gridIndex = y * canvasWidth + x;
            occupancyGrid[gridIndex] = 1;
            materialGrid[gridIndex] = materialIdx;
        }
    }

    for (let i = 0; i < particleCount; i++) {
        const idx = i * 6;
        let px = particles[idx];
        let py = particles[idx + 1];
        let vx = particles[idx + 2];
        let vy = particles[idx + 3];
        const materialIdx = particles[idx + 4];
        
        // Skip if particle is not initialized (material index -1)
        if (materialIdx < 0) continue;
        
        const material = materials[materialIdx];
        const viscosity = material[2];
        const bounce = material[3];
        const friction = material[4];
        const flowRate = material[5];
        const density = material[6];

        // Apply gravity (scaled by density)
        vy += gravity * density;
        
        // Fire rises instead of falls
        if (materialIdx === 3) { // Fire
            vy -= gravity * 0.8;
        }

        // Mouse interaction
        if (mouseX >= 0 && mouseY >= 0 && mouseX < width - 140) {
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

        // Apply material-specific viscosity
        vx *= viscosity;
        vy *= viscosity;
        
        // Get current grid position
        const currentX = floor(px);
        const currentY = floor(py);
        const targetY = floor(py + vy);
        const targetX = floor(px + vx);
        
        // Realistic flow physics - check multiple directions
        let canMoveDown = false;
        let canMoveLeft = false;
        let canMoveRight = false;
        let canMoveDownLeft = false;
        let canMoveDownRight = false;
        
        // Check if can move straight down
        if (targetY < canvasHeight && targetY >= 0 && currentX >= 0 && currentX < canvasWidth) {
            const gridIndex = targetY * canvasWidth + currentX;
            if (targetY !== currentY && occupancyGrid[gridIndex] === 0) {
                canMoveDown = true;
            }
        }
        
        // If can't move straight down, check diagonals and sides (flow behavior)
        if (!canMoveDown && vy > 0) {
            // Check down-left
            const checkX = currentX - 1;
            const checkY = targetY;
            if (checkX >= 0 && checkY < canvasHeight && checkY >= 0) {
                const gridIndex = checkY * canvasWidth + checkX;
                if (occupancyGrid[gridIndex] === 0) {
                    canMoveDownLeft = true;
                }
            }
            
            // Check down-right
            const checkX2 = currentX + 1;
            if (checkX2 < canvasWidth && checkY < canvasHeight && checkY >= 0) {
                const gridIndex = checkY * canvasWidth + checkX2;
                if (occupancyGrid[gridIndex] === 0) {
                    canMoveDownRight = true;
                }
            }
            
            // If can't move down at all, check sides for flow
            if (!canMoveDownLeft && !canMoveDownRight) {
                // Check left
                const leftX = currentX - 1;
                if (leftX >= 0 && currentY >= 0 && currentY < canvasHeight) {
                    const gridIndex = currentY * canvasWidth + leftX;
                    if (occupancyGrid[gridIndex] === 0) {
                        canMoveLeft = true;
                    }
                }
                
                // Check right
                const rightX = currentX + 1;
                if (rightX < canvasWidth && currentY >= 0 && currentY < canvasHeight) {
                    const gridIndex = currentY * canvasWidth + rightX;
                    if (occupancyGrid[gridIndex] === 0) {
                        canMoveRight = true;
                    }
                }
            }
        }
        
        // Apply flow behavior based on what's available
        let newX = px;
        let newY = py;
        
        if (canMoveDown) {
            // Move straight down
            newY += vy;
            newX += vx * flowRate; // Allow some horizontal movement while falling
        } else if (canMoveDownLeft && canMoveDownRight) {
            // Both diagonals available - choose based on velocity or random
            if (abs(vx) > 0.2) {
                // Prefer direction of current velocity
                if (vx < 0) {
                    newX -= flowRate;
                    newY += vy * 0.8;
                } else {
                    newX += flowRate;
                    newY += vy * 0.8;
                }
            } else {
                // Random choice for natural flow
                if (random() < 0.5) {
                    newX -= flowRate;
                    newY += vy * 0.8;
                } else {
                    newX += flowRate;
                    newY += vy * 0.8;
                }
            }
            vy *= 0.85; // Slow down on diagonal
        } else if (canMoveDownLeft) {
            newX -= flowRate;
            newY += vy * 0.8;
            vy *= 0.85;
        } else if (canMoveDownRight) {
            newX += flowRate;
            newY += vy * 0.8;
            vy *= 0.85;
        } else if (canMoveLeft || canMoveRight) {
            // Flow sideways when can't fall (like water spreading)
            if (canMoveLeft && canMoveRight) {
                // Prefer direction of velocity, or spread both ways
                if (abs(vx) > 0.2) {
                    newX += vx * flowRate * 2;
                } else {
                    // Spread in both directions for fluid behavior
                    newX += (random() < 0.5 ? -flowRate : flowRate);
                }
            } else if (canMoveLeft) {
                newX -= flowRate * 1.5;
            } else {
                newX += flowRate * 1.5;
            }
            vy = 0; // Stop vertical movement when flowing sideways
            vx *= 0.7; // Reduce horizontal velocity when flowing
        } else {
            // Can't move - stop
            vy = 0;
            vx *= 0.6; // Dampen horizontal velocity
        }
        
        // Update position
        px = constrain(newX, 0, width - 141);
        py = constrain(newY, 0, canvasHeight - 1);
        
        // Material interactions - check adjacent particles
        const finalX = floor(px);
        const finalY = floor(py);
        if (finalX >= 0 && finalX < canvasWidth && finalY >= 0 && finalY < canvasHeight) {
            // Check all 4 adjacent cells for material interactions
            const checkPositions = [
                [finalX, finalY - 1],     // Up
                [finalX, finalY + 1],     // Down
                [finalX - 1, finalY],     // Left
                [finalX + 1, finalY]      // Right
            ];
            
            for (let pos of checkPositions) {
                const checkX = pos[0];
                const checkY = pos[1];
                if (checkX >= 0 && checkX < canvasWidth && checkY >= 0 && checkY < canvasHeight) {
                    const gridIndex = checkY * canvasWidth + checkX;
                    const adjacentMaterial = materialGrid[gridIndex];
                    
                    // Water (1) puts out Fire (3)
                    if (materialIdx === 1 && adjacentMaterial === 3) {
                        // Find and remove the fire particle
                        removeParticleAtPosition(checkX, checkY);
                    }
                    
                    // Fire (3) melts Snow (4)
                    if (materialIdx === 3 && adjacentMaterial === 4) {
                        // Find and remove the snow particle
                        removeParticleAtPosition(checkX, checkY);
                    }
                }
            }
        }

        // Boundary collision with material-specific bounce
        if (px < 0) {
            px = 0;
            vx *= -bounce;
        } else if (px >= width - 140) {
            px = width - 141;
            vx *= -bounce;
        }
        if (py < 0) {
            py = 0;
            vy *= -bounce;
        } else if (py >= canvasHeight) {
            py = canvasHeight - 1;
            vy = 0; // Stop at floor
            vx *= friction; // Floor friction
        }

        // Update particle array
        particles[idx] = px;
        particles[idx + 1] = py;
        particles[idx + 2] = vx;
        particles[idx + 3] = vy;

        // Draw particle
        const x = floor(px);
        const y = floor(py);
        if (x >= 0 && x < width - 140 && y >= 0 && y < canvasHeight) {
            const colorData = materialColors[materialIdx];
            const pixelIndex = (y * canvasWidth + x) * 4;
            // Blend with existing pixels for better visibility
            const alpha = 255;
            pixels[pixelIndex + 0] = colorData[1]; // Red
            pixels[pixelIndex + 1] = colorData[2]; // Green
            pixels[pixelIndex + 2] = colorData[3]; // Blue
            pixels[pixelIndex + 3] = alpha;       // Alpha
        }
    }

    updatePixels();
    
    // Draw material info
    fill(255);
    noStroke();
    textAlign(LEFT);
    textSize(12);
    text('Selected: ' + materials[selectedMaterial][0], width - 130, height - 50);
    text('Active: ' + particleCountActive, width - 130, height - 35);
    text('Click to place', width - 130, height - 20);
    
    // Draw cursor indicator
    if (mouseX >= 0 && mouseX < width - 140 && mouseY >= 0 && mouseY < height) {
        fill(255, 255, 255, 100);
        noStroke();
        ellipse(mouseX, mouseY, 10, 10);
    }
}

function mousePressed() {
    console.log('Mouse pressed at:', mouseX, mouseY);
    if (mouseX >= 0 && mouseX < width - 140 && mouseY >= 0 && mouseY < height) {
        addParticles(mouseX, mouseY);
        console.log('Added particles, active count:', particleCountActive);
    }
}

function mouseDragged() {
    if (mouseX >= 0 && mouseX < width - 140 && mouseY >= 0 && mouseY < height) {
        addParticles(mouseX, mouseY);
    }
}

function removeParticleAtPosition(x, y) {
    // Find particle at this position and remove it
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 6;
        const materialIdx = particles[idx + 4];
        if (materialIdx < 0) continue;
        
        const px = floor(particles[idx]);
        const py = floor(particles[idx + 1]);
        
        if (px === x && py === y) {
            // Remove this particle
            particles[idx] = -999;
            particles[idx + 1] = -999;
            particles[idx + 2] = 0;
            particles[idx + 3] = 0;
            particles[idx + 4] = -1;
            particleCountActive--;
            break; // Only remove one particle at this position
        }
    }
}

function addParticles(x, y) {
    // Find empty particle slots and fill them
    const particlesToAdd = 100;
    let added = 0;
    
    // Make sure x and y are within bounds
    x = constrain(x, 0, width - 141);
    y = constrain(y, 0, height - 1);
    
    for (let i = 0; i < particleCount && added < particlesToAdd; i++) {
        const idx = i * 6;
        const materialIdx = particles[idx + 4];
        const px = particles[idx];
        
        // If particle is inactive (material index is -1 or position is -999)
        if (materialIdx < 0 || px < -100) {
            particles[idx] = x + random(-5, 5);
            particles[idx + 1] = y + random(-5, 5);
            particles[idx + 2] = random(-1, 1);
            particles[idx + 3] = random(-1, 1);
            particles[idx + 4] = selectedMaterial;
            added++;
            particleCountActive++;
        }
    }
    
    if (added === 0) {
        console.log('No inactive particles found! Active:', particleCountActive);
    } else {
        console.log('Added', added, 'particles');
    }
}
