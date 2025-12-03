/************************************************************
 *  GEOMETRY DASH ENGINE — SECTION 3A
 *  GLOBAL CONSTANTS • CORE VARIABLES • GLOW ENGINE • PARTICLES
 ************************************************************/

/* ==========================================================
   CANVAS SETUP
   ========================================================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Canvas size is fixed at 1280 × 720
const W = canvas.width;
const H = canvas.height;


/* ==========================================================
   GAME STATE FLAGS
   ========================================================== */

let scene = "menu";   
// menu • playing • dead • complete • editor

let currentLevel = 0;        // current level index
let attempts = 0;            // number of attempts
let isCustomLevel = false;   // if editor level is being played

/* These get filled with objects during level creation */
let objects = [];            
let finishX = 0;             
let cameraX = 0;             


/* ==========================================================
   CLASSIC GD COLOR PALETTE (Theme D)
   ========================================================== */

const COLORS = {
  cube: "#FFD700",            // classic yellow cube
  cubeGlow: "#FF8800",        // warm orange glow
  spike: "#FF1177",           // pink spikes
  pad: "#FFCC00",             // gold jump pad
  gravityPortal: "#00FFFF",   // cyan gravity portal
  speedPortal: "#FFAA00",     // orange speed portal
  finishPortal: "#00FF77",    // green finish portal
  ground: "#003366",          // blue ground
  backgroundTop: "#003d8d",   // menu gradient top
  backgroundBottom: "#000915" // deep space bottom
};


/* ==========================================================
   PLAYER OBJECT (Classic GD Cube)
   ========================================================== */

const player = {
  x: 200,
  y: 300,
  size: 48,
  velY: 0,
  rotation: 0,
  onGround: false,
  gravityDir: 1, // 1 = normal down, -1 = upside down
  dead: false
};


/* ==========================================================
   PHYSICS VALUES
   ========================================================== */

const GRAVITY = 0.6;          // base gravity
let SPEED = 6;                // base speed (pixels/frame)
let speedMult = 1;            // speed portal multiplier
const JUMP_VELOCITY = -15;    // standard jump force
const GROUND_Y = 620;         // ground level
const CEIL_Y = 100;           // ceiling when flipped


/* ==========================================================
   INPUT HANDLING
   ========================================================== */

let jumpQueued = false;

window.addEventListener("keydown", e => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    if (scene === "playing") jumpQueued = true;
  }
  if (e.code === "Escape") {
    if (scene === "playing" || scene === "editor") goMenu();
  }
});

canvas.addEventListener("mousedown", () => {
  if (scene === "playing") jumpQueued = true;
});


/************************************************************
 *  GLOW ENGINE — Creates Classic GD Neon Glow
 ************************************************************/

/*
  The glow engine works by drawing multiple blurred
  layers beneath an object:

  • First large blur (outer halo)
  • Medium blur (inner halo)
  • Sharp outline glow
  • Solid shape on top

  This produces GD-style neon appearance.
*/

function drawGlowShape(drawFunction, x, y, glowColor) {
  ctx.save();

  // Outer glow (largest, softest)
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 40;
  drawFunction(x, y);

  // Middle glow
  ctx.shadowBlur = 20;
  drawFunction(x, y);

  // Sharp glow outline
  ctx.shadowBlur = 8;
  drawFunction(x, y);

  // Solid shape (normal draw)
  ctx.shadowBlur = 0;
  drawFunction(x, y);

  ctx.restore();
}


/************************************************************
 *  PARTICLE ENGINE — Floating Sparks, Burst Effects
 ************************************************************/

const particles = [];

/*
  Particles are used for:
  • Portal entry bursts
  • Level complete pops
  • Jump pad sparkles
  • Decorative effects
*/

function spawnParticle(x, y, color, size = 6, life = 40) {
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    size,
    color,
    life,
    maxLife: life
  });
}

function updateParticles() {
  for (let p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    // fade effect
    p.alpha = p.life / p.maxLife;
  }

  // remove dead particles
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (let p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
/************************************************************
 *  GEOMETRY DASH ENGINE — SECTION 3B
 *  RENDER ENGINE (Cube, Spikes, Portals, Pads, Ground, BG)
 ************************************************************/


/* ==========================================================
   BACKGROUND RENDERER
   ========================================================== */

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.backgroundTop);
  g.addColorStop(1, COLORS.backgroundBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}


/* ==========================================================
   GROUND RENDERER
   ========================================================== */

function drawGround() {
  ctx.save();

  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Decorative ground tiles
  ctx.fillStyle = "#004080";
  for (let x = -(cameraX % 50) - 50; x < W + 50; x += 50) {
    ctx.fillRect(x, GROUND_Y - 30, 40, 30);
  }

  ctx.restore();
}


/************************************************************
 *  CLASSIC GEOMETRY DASH CUBE
 ************************************************************/

/*
  The cube uses layered squares:

  • Glow layer
  • Black outline
  • Inner yellow fill
  • Eye squares (classic GD style)
*/

function drawPlayerCube() {
  const s = player.size;
  const half = s / 2;
  const px = player.x - cameraX;
  const py = player.y;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.rotation);

  const drawCubeShape = () => {
    // Outer fill
    ctx.fillStyle = COLORS.cube;
    ctx.fillRect(-half, -half, s, s);

    // Black outline
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#000";
    ctx.strokeRect(-half, -half, s, s);

    // Eye squares
    ctx.fillStyle = "#000";
    ctx.fillRect(-half + 10, -half + 10, 12, 12);
    ctx.fillRect(half - 22, -half + 10, 12, 12);
  };

  drawGlowShape(drawCubeShape, 0, 0, COLORS.cubeGlow);

  ctx.restore();
}


/************************************************************
 *  SPIKES
 ************************************************************/

function drawSpike(obj) {
  const x = obj.x - cameraX;
  const y = GROUND_Y;

  const drawSpikeShape = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + obj.w / 2, y - obj.h);
    ctx.lineTo(x + obj.w, y);
    ctx.closePath();

    ctx.fillStyle = COLORS.spike;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctx.stroke();
  };

  drawGlowShape(drawSpikeShape, 0, 0, COLORS.spike);
}


/************************************************************
 *  JUMP PAD (Gold Pad)
 ************************************************************/

function drawPad(obj) {
  const x = obj.x - cameraX;
  const y = GROUND_Y - obj.h;

  const drawPadShape = () => {
    ctx.fillStyle = COLORS.pad;
    ctx.fillRect(x - obj.w / 2, y, obj.w, obj.h);

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctx.strokeRect(x - obj.w / 2, y, obj.w, obj.h);
  };

  drawGlowShape(drawPadShape, 0, 0, COLORS.pad);
}


/************************************************************
 *  GRAVITY PORTAL (Cyan Portal)
 ************************************************************/

/*
  This uses:
  • Outer ring
  • Inner rotating diamond
  • Glow
*/

let gravityPortalRotation = 0;

function drawGravityPortal(obj) {
  const x = obj.x - cameraX;
  const y = GROUND_Y - obj.h / 2;

  gravityPortalRotation += 0.05;

  const drawShape = () => {
    ctx.save();

    // Outer ring
    ctx.strokeStyle = COLORS.gravityPortal;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, obj.h / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Inner diamond
    ctx.translate(x, y);
    ctx.rotate(gravityPortalRotation);
    ctx.fillStyle = COLORS.gravityPortal;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(15, 0);
    ctx.lineTo(0, 15);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  drawGlowShape(drawShape, 0, 0, COLORS.gravityPortal);
}


/************************************************************
 *  SPEED PORTAL (Orange Portal)
 ************************************************************/

/*
  • Outer ring
  • Rotating arrows
*/

let speedPortalRotation = 0;

function drawSpeedPortal(obj) {
  const x = obj.x - cameraX;
  const y = GROUND_Y - obj.h / 2;

  speedPortalRotation += 0.08;

  const drawShape = () => {
    ctx.save();

    // Outer ring
    ctx.strokeStyle = COLORS.speedPortal;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, obj.h / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Arrows
    ctx.translate(x, y);
    ctx.rotate(speedPortalRotation);

    ctx.fillStyle = COLORS.speedPortal;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(35, 5);
      ctx.lineTo(35, -5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  drawGlowShape(drawShape, 0, 0, COLORS.speedPortal);
}


/************************************************************
 *  FINISH PORTAL (Green Goal Portal)
 ************************************************************/

function drawFinishPortal() {
  const x = finishX - cameraX;
  const y = GROUND_Y - 100;

  const drawShape = () => {
    ctx.save();

    ctx.strokeStyle = COLORS.finishPortal;
    ctx.lineWidth = 8;
    ctx.strokeRect(x - 40, y, 80, 200);

    ctx.fillStyle = COLORS.finishPortal;
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x - 35 + i * 12, y + 20, 6, 160);
    }

    ctx.restore();
  };

  drawGlowShape(drawShape, 0, 0, COLORS.finishPortal);
}


/************************************************************
 *  OBJECT RENDER DISPATCHER
 ************************************************************/

function drawObjects() {
  for (let obj of objects) {
    if (obj.type === "spike") drawSpike(obj);
    if (obj.type === "pad") drawPad(obj);
    if (obj.type === "gravity") drawGravityPortal(obj);
    if (obj.type === "speed") drawSpeedPortal(obj);
  }

  drawFinishPortal();
}


/************************************************************
 *  FULL FRAME DRAW (BG → ground → objects → player → particles)
 ************************************************************/

function drawFrame() {
  drawBackground();
  drawGround();
  drawObjects();
  drawPlayerCube();
  drawParticles();
}
/************************************************************
 *  GEOMETRY DASH ENGINE — SECTION 3C
 *  LEVEL EDITOR SYSTEM (Placement, Camera, Objects, Tools)
 ************************************************************/


/* ==========================================================
   EDITOR STATE
   ========================================================== */

let editorActive = false;       // if editor mode enabled
let editorCamX = 0;             // editor camera position
let editorGrid = 50;            // grid size
let editorSelected = "spike";   // current tool
let editorPreview = {};         // preview object when hovering

// For placing objects
let mouseX = 0;
let mouseY = 0;

const EDITOR_OBJECT_TYPES = ["spike", "pad", "gravity", "speed"];


/* ==========================================================
   TRACK MOUSE POSITION FOR EDITOR
   ========================================================== */

canvas.addEventListener("mousemove", (e) => {
  if (!editorActive) return;

  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  updateEditorPreview();
});


/************************************************************
 *  GRID-SNAPPED PREVIEW POSITION
 ************************************************************/

function updateEditorPreview() {
  const worldX = editorCamX + mouseX;
  const snappedX = Math.round(worldX / editorGrid) * editorGrid;

  editorPreview = {
    type: editorSelected,
    x: snappedX,
    w: 50,
    h: 60
  };

  if (editorSelected === "pad") editorPreview.h = 20;
  if (editorSelected === "gravity") editorPreview.h = 100;
  if (editorSelected === "speed") editorPreview.h = 100;
}


/************************************************************
 *  PLACE OBJECT
 ************************************************************/

canvas.addEventListener("mousedown", (e) => {
  if (!editorActive) return;

  const worldX = editorPreview.x;

  if (e.button === 2) {
    // Right-click = delete
    deleteEditorObject(worldX);
    return;
  }

  placeEditorObject(worldX);
});


function placeEditorObject(x) {
  // Prevent double placement
  for (let obj of objects) {
    if (Math.abs(obj.x - x) < 10) return;
  }

  let obj = {
    type: editorSelected,
    x,
    w: 50,
    h: 60
  };

  if (editorSelected === "pad") {
    obj.w = 70;
    obj.h = 20;
  }
  if (editorSelected === "gravity") {
    obj.w = 80;
    obj.h = 120;
  }
  if (editorSelected === "speed") {
    obj.w = 80;
    obj.h = 120;
  }

  objects.push(obj);
}


/************************************************************
 *  DELETE OBJECT
 ************************************************************/

function deleteEditorObject(x) {
  for (let i = objects.length - 1; i >= 0; i--) {
    if (Math.abs(objects[i].x - x) < 25) {
      objects.splice(i, 1);
      return;
    }
  }
}


/************************************************************
 *  EDITOR CAMERA MOVEMENT (WASD)
 ************************************************************/

window.addEventListener("keydown", (e) => {
  if (!editorActive) return;

  if (e.key === "a" || e.key === "A") editorCamX -= 40;
  if (e.key === "d" || e.key === "D") editorCamX += 40;

  // Switch tools
  if (e.key === "1") editorSelected = "spike";
  if (e.key === "2") editorSelected = "pad";
  if (e.key === "3") editorSelected = "gravity";
  if (e.key === "4") editorSelected = "speed";

  // Play test level
  if (e.key.toLowerCase() === "p") {
    startCustomLevel();
  }
});


/************************************************************
 *  START EDITOR MODE
 ************************************************************/

function startEditor() {
  scene = "editor";
  editorActive = true;
  editorCamX = 0;
  objects = [];
  editorPreview = {};
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("editorUI").style.display = "flex";
}


/************************************************************
 *  EXIT EDITOR
 ************************************************************/

function exitEditorToMenu() {
  editorActive = false;
  scene = "menu";
  document.getElementById("editorUI").style.display = "none";
  document.getElementById("mainMenu").style.display = "flex";
}


/************************************************************
 *  DRAW EDITOR GRID + PREVIEW
 ************************************************************/

function drawEditor() {
  drawBackground();

  // Draw grid
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;

  for (let x = -(editorCamX % editorGrid); x < W; x += editorGrid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  drawGround();

  // Draw all placed objects
  for (let obj of objects) {
    if (obj.type === "spike") drawSpike(obj);
    if (obj.type === "pad") drawPad(obj);
    if (obj.type === "gravity") drawGravityPortal(obj);
    if (obj.type === "speed") drawSpeedPortal(obj);
  }

  // Draw preview object (glowing outline)
  drawEditorPreview();
}


/************************************************************
 *  EDITOR PREVIEW OUTLINE (GLOW)
 ************************************************************/

function drawEditorPreview() {
  if (!editorPreview.type) return;

  const obj = editorPreview;
  const x = obj.x - editorCamX;
  let y = GROUND_Y - obj.h;

  ctx.save();
  ctx.strokeStyle = "#00FFFF";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(x - obj.w / 2, y, obj.w, obj.h);
  ctx.restore();
}


/************************************************************
 *  PREPARE CUSTOM LEVEL FOR PLAY
 ************************************************************/

function startCustomLevel() {
  if (objects.length === 0) return;

  isCustomLevel = true;
  scene = "playing";
  editorActive = false;
  document.getElementById("editorUI").style.display = "none";

  // Copy objects into gameplay instance
  finishX = Math.max(...objects.map(o => o.x)) + 600;
  cameraX = 0;

  // Reset player
  player.x = 200;
  player.y = 300;
  player.velY = 0;
  player.rotation = 0;
  player.gravityDir = 1;

  speedMult = 1;
}


/************************************************************
 *  EDITOR BUTTONS (UI)
 ************************************************************/

document.querySelectorAll(".editorBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tool = btn.dataset.tool;

    if (tool === "menu") {
      exitEditorToMenu();
      return;
    }

    if (tool === "play") {
      startCustomLevel();
      return;
    }

    editorSelected = tool;
    document.getElementById("editorObjectLabel").textContent =
      "Object: " + tool.charAt(0).toUpperCase() + tool.slice(1);
  });
});
/************************************************************
 *  GEOMETRY DASH ENGINE — SECTION 3D
 *  GAME LOOP • PHYSICS • COLLISION • LEVELS • MENU LOGIC
 ************************************************************/


/* ==========================================================
   MENU BUTTON HANDLERS
   ========================================================== */

document.querySelectorAll(".levelCard").forEach(card => {
  card.onclick = () => {
    const lvl = parseInt(card.dataset.level);
    startLevel(lvl);
  };
});

document.getElementById("editorBtn").onclick = () => {
  startEditor();
};

document.getElementById("menuBtn").onclick = () => {
  goMenu();
};
document.getElementById("retryBtn").onclick = () => {
  if (isCustomLevel) startCustomLevel();
  else startLevel(currentLevel);
};
document.getElementById("nextBtn").onclick = () => {
  const next = currentLevel + 1;
  if (next < LEVEL_DEFINITIONS.length) startLevel(next);
  else goMenu();
};


/************************************************************
 *  BUILT-IN LEVEL DEFINITIONS
 ************************************************************/

const LEVEL_DEFINITIONS = [
  { seconds: 20, difficulty: "normal" },
  { seconds: 28, difficulty: "hard" },
  { seconds: 35, difficulty: "insane" }
];


/************************************************************
 *  LEVEL BUILDER (Randomized Patterns)
 ************************************************************/

function buildLevel(level) {
  objects = [];

  const targetDistance = level.seconds * SPEED * 60;
  let x = 600;
  let lastPattern = -1;

  while (x < targetDistance - 500) {
    let pattern = Math.floor(Math.random() * 5);
    if (pattern === lastPattern) continue;
    lastPattern = pattern;

    let gap = level.difficulty === "normal" ? 260 :
              level.difficulty === "hard" ? 220 : 200;

    switch (pattern) {
      case 0: // single spike
        objects.push({ type: "spike", x, w: 50, h: 60 });
        x += gap;
        break;

      case 1: // double spike
        objects.push({ type: "spike", x, w: 50, h: 60 });
        objects.push({ type: "spike", x: x + 60, w: 50, h: 60 });
        x += gap + 60;
        break;

      case 2: // pad + spike
        objects.push({ type: "pad", x: x - 60, w: 70, h: 20 });
        objects.push({ type: "spike", x: x + 40, w: 50, h: 60 });
        x += gap;
        break;

      case 3: // triple spike (hard/insane)
        if (level.difficulty !== "normal") {
          objects.push({ type: "spike", x, w: 50, h: 60 });
          objects.push({ type: "spike", x: x + 55, w: 50, h: 60 });
          objects.push({ type: "spike", x: x + 110, w: 50, h: 60 });
        } else {
          objects.push({ type: "spike", x, w: 50, h: 60 });
        }
        x += gap + 80;
        break;

      case 4: // gravity + speed portal combo
        if (level.difficulty !== "normal") {
          objects.push({ type: "gravity", x, w: 80, h: 120 });
          x += 250;

          objects.push({
            type: "speed",
            x,
            w: 80,
            h: 120,
            mult: level.difficulty === "hard" ? 1.2 : 1.4
          });

          x += gap + 120;
        } else {
          x += gap + 120;
        }
        break;
    }
  }

  finishX = targetDistance;
}


/************************************************************
 *  START A BUILT-IN LEVEL
 ************************************************************/

function startLevel(id) {
  isCustomLevel = false;
  currentLevel = id;
  attempts++;

  const lvl = LEVEL_DEFINITIONS[id];
  buildLevel(lvl);

  // Reset player
  player.x = 200;
  player.y = 300;
  player.velY = 0;
  player.rotation = 0;
  player.gravityDir = 1;

  cameraX = 0;
  speedMult = 1;

  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("levelCompleteScreen").style.display = "none";
  scene = "playing";
}


/************************************************************
 *  RETURN TO MENU
 ************************************************************/

function goMenu() {
  scene = "menu";
  editorActive = false;
  isCustomLevel = false;

  document.getElementById("mainMenu").style.display = "flex";
  document.getElementById("levelCompleteScreen").style.display = "none";
  document.getElementById("editorUI").style.display = "none";
}


/************************************************************
 *  COLLISION / TRIGGER HELPERS
 ************************************************************/

function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    ax < bx + bw &&
    ax + aw > bx &&
    ay < by + bh &&
    ay + ah > by
  );
}


/************************************************************
 *  SPIKE COLLISION (DEATH)
 ************************************************************/

function checkSpikeCollision() {
  const px = player.x - cameraX - player.size / 2;
  const py = player.y - player.size / 2;

  for (let o of objects) {
    if (o.type !== "spike") continue;

    const ox = o.x - cameraX;
    const ow = o.w;
    const oh = o.h;
    const oy = GROUND_Y - oh;

    if (rectCollide(px, py, player.size, player.size, ox, oy, ow, oh)) {
      return true;
    }
  }
  return false;
}


/************************************************************
 *  JUMP PAD (Launch)
 ************************************************************/

function checkPadTrigger() {
  for (let o of objects) {
    if (o.type !== "pad") continue;

    const ox = o.x - cameraX - o.w / 2;
    const oy = GROUND_Y - o.h;

    if (rectCollide(player.x - cameraX - 20, player.y - 20, 40, 40, ox, oy, o.w, o.h)) {
      player.velY = JUMP_VELOCITY * player.gravityDir;
      spawnParticle(player.x, player.y, COLORS.pad);
    }
  }
}


/************************************************************
 *  GRAVITY PORTAL (Flip Gravity)
 ************************************************************/

function checkGravityPortal() {
  for (let o of objects) {
    if (o.type !== "gravity") continue;

    const ox = o.x - cameraX - o.w / 2;
    const oy = GROUND_Y - o.h;

    if (rectCollide(player.x - cameraX - 20, player.y - 20, 40, 40, ox, oy, o.w, o.h)) {
      player.gravityDir *= -1;
      player.rotation += Math.PI;
      spawnParticle(player.x, player.y, COLORS.gravityPortal);
    }
  }
}


/************************************************************
 *  SPEED PORTAL
 ************************************************************/

function checkSpeedPortal() {
  for (let o of objects) {
    if (o.type !== "speed") continue;

    const ox = o.x - cameraX - o.w / 2;
    const oy = GROUND_Y - o.h;

    if (rectCollide(player.x - cameraX - 20, player.y - 20, 40, 40, ox, oy, o.w, o.h)) {
      speedMult = o.mult || 1.2;
      spawnParticle(player.x, player.y, COLORS.speedPortal);
    }
  }
}


/************************************************************
 *  FINISH PORTAL (Level Complete)
 ************************************************************/

function checkFinish() {
  if (player.x >= finishX - 100) {
    scene = "complete";
    document.getElementById("levelCompleteScreen").style.display = "flex";
    return true;
  }
  return false;
}


/************************************************************
 *  PHYSICS + MOVEMENT
 ************************************************************/

function updatePlayerPhysics() {
  // Camera scrolls forward
  cameraX += SPEED * speedMult;

  // Jump (queued from input)
  if (jumpQueued && player.onGround) {
    player.velY = JUMP_VELOCITY * player.gravityDir;
    player.onGround = false;
  }
  jumpQueued = false;

  // Gravity
  player.velY += GRAVITY * player.gravityDir;
  player.y += player.velY;

  const half = player.size / 2;

  // Ground collision
  if (player.gravityDir === 1) {
    if (player.y + half >= GROUND_Y) {
      player.y = GROUND_Y - half;
      player.velY = 0;
      player.onGround = true;
    }
  } else {
    if (player.y - half <= CEIL_Y) {
      player.y = CEIL_Y + half;
      player.velY = 0;
      player.onGround = true;
    }
  }

  // Rotation while moving in air
  if (!player.onGround) {
    player.rotation += 0.22 * player.gravityDir;
  } else {
    // Snap rotation to nearest 90°
    const snap = Math.PI / 2;
    player.rotation = Math.round(player.rotation / snap) * snap;
  }
}


/************************************************************
 *  MASTER UPDATE LOOP
 ************************************************************/

function update() {
  requestAnimationFrame(update);

  if (scene === "menu") {
    drawBackground();
    return;
  }

  if (scene === "editor") {
    drawEditor();
    return;
  }

  if (scene === "complete") {
    drawFrame();
    return;
  }

  if (scene === "playing") {
    updatePlayerPhysics();
    updateParticles();

    checkPadTrigger();
    checkGravityPortal();
    checkSpeedPortal();

    if (checkSpikeCollision()) {
      // Restart level
      if (isCustomLevel) startCustomLevel();
      else startLevel(currentLevel);
      return;
    }

    if (checkFinish()) {
      return;
    }

    drawFrame();
  }
}


/************************************************************
 *  START GAME LOOP
 ************************************************************/

update();
