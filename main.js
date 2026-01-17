import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";

const canvas = document.getElementById("gl");
const overlay = document.getElementById("overlay");
const overlayCtx = overlay.getContext("2d");
const modeSelect = document.getElementById("mode");
const landmarksToggle = document.getElementById("landmarks");
const trailsToggle = document.getElementById("trails");
const nebulaeToggle = document.getElementById("nebulae");
const hint = document.getElementById("hint");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x03030a, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(80, 60, 100);

const cameraTarget = new THREE.Vector3(0, 0, 0);
let targetRadius = 140;
let currentRadius = 140;
let targetOrbit = new THREE.Vector2(0.4, 0.9);
let currentOrbit = new THREE.Vector2(0.4, 0.9);
let targetPan = new THREE.Vector3(0, 0, 0);
let currentPan = new THREE.Vector3(0, 0, 0);
let targetRoll = 0;
let currentRoll = 0;

const galaxyGroup = new THREE.Group();
galaxyGroup.rotation.x = -0.3;
scene.add(galaxyGroup);

const ambientLight = new THREE.AmbientLight(0x6b7cff, 0.45);
scene.add(ambientLight);
const keyLight = new THREE.PointLight(0xffffff, 1.1, 700);
keyLight.position.set(120, 80, 140);
scene.add(keyLight);

const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = "anonymous";
const starSprite = textureLoader.load(
  "https://threejs.org/examples/textures/sprites/spark1.png"
);
const nebulaSprite = textureLoader.load(
  "https://threejs.org/examples/textures/sprites/smoke.png"
);
const starfieldTexture = textureLoader.load(
  "https://threejs.org/examples/textures/planets/starfield.jpg"
);

const skySphere = new THREE.Mesh(
  new THREE.SphereGeometry(950, 40, 40),
  new THREE.MeshBasicMaterial({
    map: starfieldTexture,
    side: THREE.BackSide,
  })
);
scene.add(skySphere);

const starField = createSpiralGalaxy(12000, 220, 1.2, starSprite);
const nebulaField = createNebulaField(3200, 180, nebulaSprite);
const galaxyCore = createGalaxyCore(nebulaSprite);
galaxyGroup.add(galaxyCore);
galaxyGroup.add(starField.points);
galaxyGroup.add(nebulaField.points);

const celestialObjects = createCelestialObjects(textureLoader);
celestialObjects.forEach((mesh) => galaxyGroup.add(mesh));

const raycaster = new THREE.Raycaster();
const grabPlane = new THREE.Plane();

const trailA = createTrail(0x8ab4ff);
const trailB = createTrail(0xff9ad1);
scene.add(trailA.line);
scene.add(trailB.line);

const handState = {
  hands: [],
  pinch: [false, false],
  pinchDist: [null, null],
  prevPinchDist: [null, null],
  open: [false, false],
  fist: [false, false],
  lastOpen: [false, false],
  lastFist: [false, false],
  grabbed: [null, null],
};

const gestureFeedback = {
  scatter: 0,
  gravity: 0,
};

const video = document.getElementById("video");
const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.5,
});
hands.onResults(onResults);

const cameraInput = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 1280,
  height: 720,
});
cameraInput.start();

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

function onResults(results) {
  handState.hands = [];
  overlay.width = window.innerWidth;
  overlay.height = window.innerHeight;
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  drawCameraCornerRect();
  if (!results.multiHandLandmarks) {
    return;
  }
  results.multiHandLandmarks.forEach((landmarks, index) => {
    const state = analyzeHand(landmarks);
    handState.hands[index] = state;
    handState.pinch[index] = state.pinch;
    handState.open[index] = state.openPalm;
    handState.fist[index] = state.fist;
    handState.pinchDist[index] = state.pinchDist;
    if (landmarksToggle.checked) {
      drawLandmarks(landmarks);
    }
  });
}

function drawCameraCornerRect() {
  const size = Math.min(overlay.width, overlay.height) * 0.2;
  const padding = 16;
  const x = padding;
  const y = padding;
  overlayCtx.save();
  overlayCtx.beginPath();
  overlayCtx.rect(x, y, size, size);
  overlayCtx.clip();
  if (video.videoWidth && video.videoHeight) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const crop = Math.min(vw, vh);
    const sx = (vw - crop) / 2;
    const sy = (vh - crop) / 2;
    overlayCtx.translate(x + size, y);
    overlayCtx.scale(-1, 1);
    overlayCtx.drawImage(video, sx, sy, crop, crop, 0, 0, size, size);
  }
  overlayCtx.restore();
  overlayCtx.save();
  overlayCtx.strokeStyle = "rgba(138, 180, 255, 0.9)";
  overlayCtx.lineWidth = 3;
  overlayCtx.strokeRect(x, y, size, size);
  overlayCtx.restore();
}

function analyzeHand(landmarks) {
  const palmPoints = [0, 5, 9, 13, 17].map((i) => landmarks[i]);
  const palm = palmPoints.reduce(
    (acc, p) => {
      acc.x += p.x;
      acc.y += p.y;
      acc.z += p.z;
      return acc;
    },
    { x: 0, y: 0, z: 0 }
  );
  palm.x /= palmPoints.length;
  palm.y /= palmPoints.length;
  palm.z /= palmPoints.length;

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];
  const indexPip = landmarks[6];
  const middlePip = landmarks[10];
  const ringPip = landmarks[14];
  const pinkyPip = landmarks[18];
  const thumbIp = landmarks[3];

  const pinchDist = distance2D(thumbTip, indexTip);
  const pinch = pinchDist < 0.05;

  const extended = [
    indexTip.y < indexPip.y - 0.02,
    middleTip.y < middlePip.y - 0.02,
    ringTip.y < ringPip.y - 0.02,
    pinkyTip.y < pinkyPip.y - 0.02,
  ];
  const thumbExtended = thumbTip.y < thumbIp.y - 0.01;
  const openPalm = extended.filter(Boolean).length >= 3 && thumbExtended;

  const tipDistAvg =
    (distance2D(indexTip, wrist) +
      distance2D(middleTip, wrist) +
      distance2D(ringTip, wrist) +
      distance2D(pinkyTip, wrist)) /
    4;
  const fist = tipDistAvg < 0.18 && extended.filter(Boolean).length <= 1;

  return { palm, pinch, openPalm, fist, pinchDist };
}

function drawLandmarks(landmarks) {
  overlayCtx.save();
  overlayCtx.strokeStyle = "rgba(130, 180, 255, 0.7)";
  overlayCtx.lineWidth = 2;
  HAND_CONNECTIONS.forEach(([a, b]) => {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    overlayCtx.beginPath();
    overlayCtx.moveTo(p1.x * overlay.width, p1.y * overlay.height);
    overlayCtx.lineTo(p2.x * overlay.width, p2.y * overlay.height);
    overlayCtx.stroke();
  });
  overlayCtx.fillStyle = "rgba(255, 255, 255, 0.85)";
  landmarks.forEach((p) => {
    overlayCtx.beginPath();
    overlayCtx.arc(p.x * overlay.width, p.y * overlay.height, 4, 0, Math.PI * 2);
    overlayCtx.fill();
  });
  overlayCtx.restore();
}

function createSpiralGalaxy(count, maxRadius, size, sprite) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  
  const armCount = 4;
  const armSpread = 0.4;
  const coreRadius = maxRadius * 0.15;
  const diskThickness = maxRadius * 0.08;
  
  for (let i = 0; i < count; i += 1) {
    let x, y, z, r, armAngle;
    const inCore = Math.random() < 0.2;
    
    if (inCore) {
      r = Math.random() ** 1.5 * coreRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.cos(phi);
      z = r * Math.sin(phi) * Math.sin(theta);
    } else {
      r = coreRadius + Math.random() ** 0.6 * (maxRadius - coreRadius);
      const armIndex = Math.floor(Math.random() * armCount);
      const armOffset = (armIndex * Math.PI * 2) / armCount;
      const spiralTightness = 3.5;
      armAngle = armOffset + (r / maxRadius) * spiralTightness;
      const armDeviation = (Math.random() - 0.5) * armSpread;
      
      const angle = armAngle + armDeviation;
      x = r * Math.cos(angle);
      z = r * Math.sin(angle);
      
      const heightFalloff = Math.exp(-r / (maxRadius * 0.5));
      y = (Math.random() - 0.5) * diskThickness * heightFalloff;
    }
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = y;
    basePositions[i * 3 + 2] = z;
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;
    
    const distFromCenter = Math.sqrt(x * x + z * z);
    const normalizedDist = distFromCenter / maxRadius;
    
    let hue, sat, light;
    if (inCore) {
      hue = 0.1 + Math.random() * 0.05;
      sat = 0.7 + Math.random() * 0.2;
      light = 0.75 + Math.random() * 0.15;
    } else if (normalizedDist < 0.4) {
      hue = 0.15 + Math.random() * 0.1;
      sat = 0.6 + Math.random() * 0.2;
      light = 0.7 + Math.random() * 0.2;
    } else {
      hue = 0.55 + Math.random() * 0.15;
      sat = 0.5 + Math.random() * 0.3;
      light = 0.75 + Math.random() * 0.2;
    }
    
    const color = new THREE.Color().setHSL(hue, sat, light);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    sizes[i] = size * (0.5 + Math.random() * 1.5) * (inCore ? 1.4 : 1.0);
  }
  
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    map: sprite,
    alphaTest: 0.2,
    sizeAttenuation: true,
  });
  
  const points = new THREE.Points(geometry, material);
  return { points, geometry, basePositions, velocities };
}

function createNebulaField(count, radius, sprite) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  
  const armCount = 4;
  const diskThickness = radius * 0.15;
  
  for (let i = 0; i < count; i += 1) {
    const r = Math.random() ** 0.8 * radius;
    const armIndex = Math.floor(Math.random() * armCount);
    const armOffset = (armIndex * Math.PI * 2) / armCount;
    const spiralTightness = 3.5;
    const armAngle = armOffset + (r / radius) * spiralTightness;
    const armSpread = 0.6;
    const angle = armAngle + (Math.random() - 0.5) * armSpread;
    
    const x = r * Math.cos(angle) + (Math.random() - 0.5) * 15;
    const z = r * Math.sin(angle) + (Math.random() - 0.5) * 15;
    const heightFalloff = Math.exp(-r / (radius * 0.4));
    const y = (Math.random() - 0.5) * diskThickness * heightFalloff;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    const distNorm = r / radius;
    const hue = 0.7 + Math.random() * 0.2 - distNorm * 0.1;
    const sat = 0.5 + Math.random() * 0.3;
    const light = 0.3 + Math.random() * 0.3;
    
    const color = new THREE.Color().setHSL(hue, sat, light);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    sizes[i] = 2.0 + Math.random() * 3.0;
  }
  
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    size: 3.0,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
    map: sprite,
    alphaTest: 0.1,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  return { points, geometry };
}

function createGalaxyCore(sprite) {
  const geometry = new THREE.PlaneGeometry(200, 200);
  const material = new THREE.MeshBasicMaterial({
    map: sprite,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.35,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createCelestialObjects(loader) {
  const objects = [];
  const planetTextures = [
    loader.load(
      "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"
    ),
    loader.load(
      "https://threejs.org/examples/textures/planets/mars_1k_color.jpg"
    ),
    loader.load("https://threejs.org/examples/textures/planets/jupiter.jpg"),
    loader.load(
      "https://threejs.org/examples/textures/planets/venus_surface.jpg"
    ),
  ];
  for (let i = 0; i < 4; i += 1) {
    const radius = 4 + i * 1.8;
    const geometry = new THREE.SphereGeometry(radius, 24, 24);
    const material = new THREE.MeshStandardMaterial({
      map: planetTextures[i % planetTextures.length],
      emissive: 0x202040,
      metalness: 0.1,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(30 + i * 12, -10 + i * 7, -20 + i * 6);
    mesh.userData.grabbable = true;
    objects.push(mesh);
  }
  return objects;
}

function createTrail(color) {
  const maxPoints = 60;
  const positions = new Float32Array(maxPoints * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.6,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  return { line, positions, maxPoints, index: 0 };
}

function updateTrail(trail, position) {
  if (!trailsToggle.checked) {
    trail.line.visible = false;
    return;
  }
  trail.line.visible = true;
  trail.positions[trail.index * 3] = position.x;
  trail.positions[trail.index * 3 + 1] = position.y;
  trail.positions[trail.index * 3 + 2] = position.z;
  trail.index = (trail.index + 1) % trail.maxPoints;
  trail.line.geometry.attributes.position.needsUpdate = true;
}

function updateGestureEffects(delta) {
  if (gestureFeedback.scatter > 0.001) {
    gestureFeedback.scatter *= 0.92;
    scatterStars(starField, gestureFeedback.scatter);
  }
  if (gestureFeedback.gravity > 0.001) {
    applyGravity(starField, gestureFeedback.gravity, delta);
  }
}

function scatterStars(field, strength) {
  const positions = field.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += (Math.random() - 0.5) * 0.4 * strength;
    positions[i + 1] += (Math.random() - 0.5) * 0.4 * strength;
    positions[i + 2] += (Math.random() - 0.5) * 0.4 * strength;
  }
  field.geometry.attributes.position.needsUpdate = true;
}

function applyGravity(field, strength, delta) {
  const positions = field.geometry.attributes.position.array;
  const base = field.basePositions;
  const velocities = field.velocities;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const dx = -x;
    const dy = -y;
    const dz = -z;
    const distSq = dx * dx + dy * dy + dz * dz + 20;
    const pull = (strength * 12) / distSq;
    velocities[i] += dx * pull * delta;
    velocities[i + 1] += dy * pull * delta;
    velocities[i + 2] += dz * pull * delta;
    velocities[i] *= 0.985;
    velocities[i + 1] *= 0.985;
    velocities[i + 2] *= 0.985;
    positions[i] += velocities[i];
    positions[i + 1] += velocities[i + 1];
    positions[i + 2] += velocities[i + 2];
    positions[i] += (base[i] - positions[i]) * 0.002;
    positions[i + 1] += (base[i + 1] - positions[i + 1]) * 0.002;
    positions[i + 2] += (base[i + 2] - positions[i + 2]) * 0.002;
  }
  field.geometry.attributes.position.needsUpdate = true;
}

function updateControls() {
  const hands = handState.hands;
  hint.textContent = hands.length
    ? `${hands.length} hand${hands.length > 1 ? "s" : ""} detected`
    : "Show your hands to control the galaxy";

  if (hands.length > 0) {
    const primary = hands[0];
    const x = primary.palm.x * 2 - 1;
    const y = primary.palm.y * 2 - 1;
    const maxPitch = 0.8;
    const maxYaw = 1.2;
    const mode = modeSelect.value;
    if (mode === "orbit" || mode === "hybrid") {
      targetOrbit.x = THREE.MathUtils.clamp(-y, -1, 1) * maxPitch;
      targetOrbit.y = THREE.MathUtils.clamp(x, -1, 1) * maxYaw;
    }
    if (mode === "pan" || mode === "hybrid") {
      targetPan.set(
        THREE.MathUtils.clamp(x, -1, 1) * 18,
        THREE.MathUtils.clamp(-y, -1, 1) * 12,
        0
      );
    }
  }

  if (hands.length > 1) {
    const a = hands[0].palm;
    const b = hands[1].palm;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const roll = Math.atan2(dy, dx);
    targetRoll = roll * 0.6;
    const avgX = (a.x + b.x) / 2;
    const avgY = (a.y + b.y) / 2;
    targetOrbit.x = THREE.MathUtils.clamp(-(avgY * 2 - 1), -1, 1) * 0.9;
    targetOrbit.y = THREE.MathUtils.clamp(avgX * 2 - 1, -1, 1) * 1.4;
  }

  updateGestures();
  if (hands.length === 0) {
    gestureFeedback.gravity *= 0.92;
  }
}

function updateGestures() {
  for (let i = 0; i < handState.hands.length; i += 1) {
    const pinch = handState.pinch[i];
    const open = handState.open[i];
    const fist = handState.fist[i];
    const pinchDist = handState.pinchDist[i];

    if (pinch && pinchDist !== null) {
      if (handState.prevPinchDist[i] !== null) {
        const delta = pinchDist - handState.prevPinchDist[i];
        targetRadius = THREE.MathUtils.clamp(
          targetRadius + -delta * 600,
          60,
          260
        );
      }
    }

    if (open && !handState.lastOpen[i]) {
      gestureFeedback.scatter = 1;
    }
    if (fist) {
      gestureFeedback.gravity = Math.min(
        1,
        gestureFeedback.gravity + 0.04
      );
    } else {
      gestureFeedback.gravity *= 0.92;
    }

    handState.prevPinchDist[i] = pinchDist;
    handState.lastOpen[i] = open;
    handState.lastFist[i] = fist;
  }
}

function updateGrab(delta) {
  for (let i = 0; i < handState.hands.length; i += 1) {
    const hand = handState.hands[i];
    if (!hand) continue;
    const ndc = new THREE.Vector2(hand.palm.x * 2 - 1, -hand.palm.y * 2 + 1);
    if (hand.pinch) {
      if (!handState.grabbed[i]) {
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(celestialObjects, false);
        if (hits.length) {
          const hit = hits[0];
          grabPlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()),
            hit.object.position
          );
          const intersection = new THREE.Vector3();
          raycaster.ray.intersectPlane(grabPlane, intersection);
          handState.grabbed[i] = {
            object: hit.object,
            offset: hit.object.position.clone().sub(intersection),
          };
        }
      }
    } else {
      handState.grabbed[i] = null;
    }

    const grabbed = handState.grabbed[i];
    if (grabbed) {
      raycaster.setFromCamera(ndc, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(grabPlane, intersection);
      if (intersection) {
        grabbed.object.position.lerp(
          intersection.add(grabbed.offset),
          1 - Math.pow(0.2, delta * 60)
        );
      }
    }
  }
}

function updateCamera(delta) {
  const damping = 1 - Math.pow(0.12, delta * 60);
  currentOrbit.lerp(targetOrbit, damping);
  currentPan.lerp(targetPan, damping);
  currentRadius = THREE.MathUtils.lerp(currentRadius, targetRadius, damping);
  currentRoll = THREE.MathUtils.lerp(currentRoll, targetRoll, damping);

  const phi = Math.PI / 2 - currentOrbit.x;
  const theta = currentOrbit.y;
  camera.position.x =
    currentRadius * Math.sin(phi) * Math.cos(theta) + currentPan.x;
  camera.position.y = currentRadius * Math.cos(phi) + currentPan.y;
  camera.position.z =
    currentRadius * Math.sin(phi) * Math.sin(theta) + currentPan.z;
  camera.lookAt(cameraTarget.clone().add(currentPan));
  camera.up.set(Math.sin(currentRoll), Math.cos(currentRoll), 0);
}

function updateTrails() {
  const centerPlane = new THREE.Plane();
  centerPlane.setFromNormalAndCoplanarPoint(
    camera.getWorldDirection(new THREE.Vector3()),
    cameraTarget.clone().add(currentPan)
  );
  if (handState.hands[0]) {
    updateTrailFromHand(trailA, handState.hands[0], centerPlane);
  } else {
    trailA.line.visible = false;
  }
  if (handState.hands[1]) {
    updateTrailFromHand(trailB, handState.hands[1], centerPlane);
  } else {
    trailB.line.visible = false;
  }
}

function updateTrailFromHand(trail, hand, plane) {
  const ndc = new THREE.Vector2(hand.palm.x * 2 - 1, -hand.palm.y * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersection);
  updateTrail(trail, intersection);
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

let lastTime = performance.now();

function animate(time) {
  const delta = Math.min(0.05, (time - lastTime) / 1000);
  lastTime = time;
  updateControls();
  updateCamera(delta);
  updateGestureEffects(delta);
  updateGrab(delta);
  updateTrails();
  nebulaField.points.visible = nebulaeToggle.checked;
  galaxyGroup.rotation.y += delta * 0.03;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
