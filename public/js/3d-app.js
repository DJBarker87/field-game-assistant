/**
 * Field Game 3D Visualizer
 * Part 1: Core scene, camera, controls, and pitch
 */

// ============================================
// CONSTANTS
// ============================================
const PITCH = {
  // Real Field Game pitch is ~110m x 75m
  // We'll use a scale where 1 unit = 1 meter
  length: 110,
  width: 75,
  
  // Line positions (from left goal line)
  goalLine: 0,
  threeYard: 3,
  fifteenYard: 15,
  halfway: 55,
  
  // Goal dimensions
  goalWidth: 15,  // Distance between posts
  goalHeight: 3,  // Crossbar height (Field Game goals are lower than football)
  
  // Colors
  grassDark: 0x1a472a,
  grassLight: 0x2d5a27,
  lineColor: 0xffffff,
  lineOpacity: 0.8
};

const COLORS = {
  attacking: 0x2980b9,
  defending: 0xc0392b,
  ball: 0xf1c40f,
  highlight: 0xf1c40f,
  eton: 0x96c8a2
};

// ============================================
// GLOBAL STATE
// ============================================
const State = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  
  // Scene objects
  pitch: null,
  players: new Map(),
  ball: null,
  
  // Scenario state
  scenarios: {},
  currentScenario: null,
  sequence: [],
  currentStep: 0,
  isPlaying: false,
  playInterval: null,
  
  // Animation
  clock: null,
  animationMixers: []
};

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  console.log('Initializing Field Game 3D...');
  
  // Create scene
  State.scene = new THREE.Scene();
  State.scene.background = new THREE.Color(0x0a1a0e);
  State.scene.fog = new THREE.Fog(0x0a1a0e, 100, 250);
  
  // Create camera
  State.camera = new THREE.PerspectiveCamera(
    60, // FOV
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  // Start with a nice overview angle
  State.camera.position.set(55, 60, 80);
  State.camera.lookAt(55, 0, 37.5);
  
  // Create renderer
  const canvas = document.getElementById('canvas3d');
  State.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  State.renderer.setSize(window.innerWidth, window.innerHeight);
  State.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  State.renderer.shadowMap.enabled = true;
  State.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  State.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  State.renderer.toneMappingExposure = 1.0;
  
  // Clock for animations
  State.clock = new THREE.Clock();
  
  // Setup controls (OrbitControls loaded separately)
  setupControls();
  
  // Add lighting
  setupLighting();
  
  // Add atmosphere (sky, mist, stadium lights)
  setupAtmosphere();
  
  // Create pitch
  createPitch();
  
  // Load scenarios
  await loadScenarios();
  
  // Setup UI
  setupUI();
  
  // Hide loading
  document.getElementById('loading').style.display = 'none';
  
  // Handle resize
  window.addEventListener('resize', onResize);
  
  // Start render loop
  animate();
  
  console.log('Field Game 3D initialized!');
}

// ============================================
// CAMERA CONTROLS
// ============================================
function setupControls() {
  // Simple orbit controls implementation
  // (We'll use a basic version since OrbitControls needs separate import)
  
  const camera = State.camera;
  const canvas = State.renderer.domElement;
  
  let isDragging = false;
  let isRightDrag = false;
  let previousMousePosition = { x: 0, y: 0 };
  
  // Orbit parameters
  let spherical = {
    radius: camera.position.distanceTo(new THREE.Vector3(55, 0, 37.5)),
    theta: Math.atan2(camera.position.x - 55, camera.position.z - 37.5),
    phi: Math.acos((camera.position.y) / camera.position.distanceTo(new THREE.Vector3(55, 0, 37.5)))
  };
  let target = new THREE.Vector3(55, 0, 37.5);
  
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    isRightDrag = e.button === 2;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });
  
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  
  window.addEventListener('mouseup', () => {
    isDragging = false;
    isRightDrag = false;
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;
    
    if (isRightDrag) {
      // Pan
      const panSpeed = 0.1;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      camera.getWorldDirection(right);
      right.crossVectors(up, right).normalize();
      
      target.addScaledVector(right, -deltaX * panSpeed);
      target.y += deltaY * panSpeed;
      target.y = Math.max(0, Math.min(50, target.y));
    } else {
      // Orbit
      spherical.theta -= deltaX * 0.01;
      spherical.phi -= deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, spherical.phi));
    }
    
    updateCamera();
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });
  
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    spherical.radius *= 1 + e.deltaY * 0.001;
    spherical.radius = Math.max(20, Math.min(200, spherical.radius));
    updateCamera();
  }, { passive: false });
  
  function updateCamera() {
    camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
    camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    camera.lookAt(target);
  }
  
  State.controls = {
    target,
    spherical,
    update: updateCamera,
    setTarget: (x, y, z) => {
      target.set(x, y, z);
      updateCamera();
    }
  };
}

// ============================================
// LIGHTING
// ============================================
function setupLighting() {
  // Ambient light - soft overall illumination
  const ambient = new THREE.AmbientLight(0x404050, 0.4);
  State.scene.add(ambient);
  
  // Hemisphere light - sky/ground color blend
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.6);
  State.scene.add(hemi);
  
  // Main directional light (sun) - casts shadows
  const sun = new THREE.DirectionalLight(0xfffaf0, 1.2);
  sun.position.set(60, 100, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 4096;
  sun.shadow.mapSize.height = 4096;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 250;
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0001;
  sun.shadow.normalBias = 0.02;
  State.scene.add(sun);
  
  // Store sun reference for potential day/night effects
  State.sun = sun;
  
  // Fill light from opposite side (cooler)
  const fill = new THREE.DirectionalLight(0xadd8e6, 0.25);
  fill.position.set(-40, 50, -30);
  State.scene.add(fill);
  
  // Rim light for player silhouettes
  const rim = new THREE.DirectionalLight(0xffffff, 0.15);
  rim.position.set(0, 20, -50);
  State.scene.add(rim);
}

// ============================================
// ATMOSPHERE & ENVIRONMENT
// ============================================
function setupAtmosphere() {
  // Gradient sky
  const skyGeo = new THREE.SphereGeometry(200, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0077be) },
      bottomColor: { value: new THREE.Color(0x89cff0) },
      offset: { value: 20 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });
  
  const sky = new THREE.Mesh(skyGeo, skyMat);
  State.scene.add(sky);
  State.sky = sky;
  
  // Subtle ground mist
  createGroundMist();
  
  // Stadium lights (decorative)
  createStadiumLights();
}

function createGroundMist() {
  // Particle system for subtle ground-level mist
  const particleCount = 500;
  const positions = new Float32Array(particleCount * 3);
  const opacities = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = Math.random() * PITCH.length;     // x
    positions[i * 3 + 1] = Math.random() * 2;             // y (low to ground)
    positions[i * 3 + 2] = Math.random() * PITCH.width;   // z
    opacities[i] = Math.random() * 0.3;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.15,
    sizeAttenuation: true,
    depthWrite: false
  });
  
  const mist = new THREE.Points(geometry, material);
  mist.name = 'groundMist';
  State.scene.add(mist);
  State.mist = mist;
}

function createStadiumLights() {
  // Four corner light towers (decorative)
  const towerPositions = [
    { x: -8, z: -8 },
    { x: PITCH.length + 8, z: -8 },
    { x: -8, z: PITCH.width + 8 },
    { x: PITCH.length + 8, z: PITCH.width + 8 }
  ];
  
  towerPositions.forEach(pos => {
    // Tower pole
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 25, 8);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.7,
      metalness: 0.3
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(pos.x, 12.5, pos.z);
    pole.castShadow = true;
    State.scene.add(pole);
    
    // Light housing
    const housingGeo = new THREE.BoxGeometry(3, 1.5, 2);
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.5
    });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(pos.x, 25, pos.z);
    
    // Angle toward pitch center
    const angleToCenter = Math.atan2(PITCH.width/2 - pos.z, PITCH.length/2 - pos.x);
    housing.rotation.y = angleToCenter;
    housing.rotation.x = 0.3;  // Tilt down
    State.scene.add(housing);
    
    // Light glow
    const glowGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(pos.x, 24.5, pos.z);
    State.scene.add(glow);
  });
}

// ============================================
// PITCH CREATION
// ============================================
function createPitch() {
  const pitchGroup = new THREE.Group();
  pitchGroup.name = 'pitch';
  
  // --- Ground plane with grass stripes ---
  const stripeWidth = 10;
  const numStripes = Math.ceil(PITCH.length / stripeWidth);
  
  for (let i = 0; i < numStripes; i++) {
    const stripeGeo = new THREE.PlaneGeometry(stripeWidth, PITCH.width);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? PITCH.grassDark : PITCH.grassLight,
      roughness: 0.8,
      metalness: 0.0
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i * stripeWidth + stripeWidth / 2, 0, PITCH.width / 2);
    stripe.receiveShadow = true;
    pitchGroup.add(stripe);
  }
  
  // --- Pitch lines ---
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: PITCH.lineColor, 
    transparent: true, 
    opacity: PITCH.lineOpacity 
  });
  
  // Helper to create a line
  function createLine(points) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(p => new THREE.Vector3(p[0], 0.05, p[1]))
    );
    return new THREE.Line(geometry, lineMaterial);
  }
  
  // Touchlines (sidelines)
  pitchGroup.add(createLine([[0, 0], [PITCH.length, 0]]));
  pitchGroup.add(createLine([[0, PITCH.width], [PITCH.length, PITCH.width]]));
  
  // Goal lines
  pitchGroup.add(createLine([[0, 0], [0, PITCH.width]]));
  pitchGroup.add(createLine([[PITCH.length, 0], [PITCH.length, PITCH.width]]));
  
  // Halfway line
  pitchGroup.add(createLine([[PITCH.halfway, 0], [PITCH.halfway, PITCH.width]]));
  
  // 15-yard lines
  pitchGroup.add(createLine([[PITCH.fifteenYard, 0], [PITCH.fifteenYard, PITCH.width]]));
  pitchGroup.add(createLine([[PITCH.length - PITCH.fifteenYard, 0], [PITCH.length - PITCH.fifteenYard, PITCH.width]]));
  
  // 3-yard lines (dashed effect with segments)
  const dashLength = 1.5;
  const gapLength = 1.5;
  for (let z = 0; z < PITCH.width; z += dashLength + gapLength) {
    const endZ = Math.min(z + dashLength, PITCH.width);
    pitchGroup.add(createLine([[PITCH.threeYard, z], [PITCH.threeYard, endZ]]));
    pitchGroup.add(createLine([[PITCH.length - PITCH.threeYard, z], [PITCH.length - PITCH.threeYard, endZ]]));
  }
  
  // Tramlines (dashed horizontal lines at 1/4 and 3/4 width)
  const tramline1 = PITCH.width * 0.25;
  const tramline2 = PITCH.width * 0.75;
  for (let x = 0; x < PITCH.length; x += dashLength + gapLength) {
    const endX = Math.min(x + dashLength, PITCH.length);
    pitchGroup.add(createLine([[x, tramline1], [endX, tramline1]]));
    pitchGroup.add(createLine([[x, tramline2], [endX, tramline2]]));
  }
  
  // --- Goals ---
  createGoal(pitchGroup, 0, false);  // Left goal
  createGoal(pitchGroup, PITCH.length, true);  // Right goal
  
  State.scene.add(pitchGroup);
  State.pitch = pitchGroup;
}

function createGoal(parent, x, flipDirection) {
  const goalGroup = new THREE.Group();
  
  const postRadius = 0.1;
  const goalDepth = 2;
  const goalY1 = (PITCH.width - PITCH.goalWidth) / 2;
  const goalY2 = goalY1 + PITCH.goalWidth;
  
  // Material for posts
  const postMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.8
  });
  
  // Left post
  const leftPost = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, PITCH.goalHeight, 8),
    postMat
  );
  leftPost.position.set(x, PITCH.goalHeight / 2, goalY1);
  leftPost.castShadow = true;
  goalGroup.add(leftPost);
  
  // Right post
  const rightPost = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, PITCH.goalHeight, 8),
    postMat
  );
  rightPost.position.set(x, PITCH.goalHeight / 2, goalY2);
  rightPost.castShadow = true;
  goalGroup.add(rightPost);
  
  // Crossbar
  const crossbar = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, PITCH.goalWidth, 8),
    postMat
  );
  crossbar.rotation.x = Math.PI / 2;
  crossbar.position.set(x, PITCH.goalHeight, (goalY1 + goalY2) / 2);
  crossbar.castShadow = true;
  goalGroup.add(crossbar);
  
  // Net (simple mesh)
  const netMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    wireframe: true
  });
  
  // Back net
  const backNet = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.goalWidth, PITCH.goalHeight, 8, 4),
    netMat
  );
  const netX = flipDirection ? x + goalDepth : x - goalDepth;
  backNet.position.set(netX, PITCH.goalHeight / 2, (goalY1 + goalY2) / 2);
  backNet.rotation.y = Math.PI / 2;
  goalGroup.add(backNet);
  
  // Side nets
  const sideNetGeo = new THREE.PlaneGeometry(goalDepth, PITCH.goalHeight, 2, 4);
  
  const leftNet = new THREE.Mesh(sideNetGeo, netMat);
  leftNet.position.set((x + netX) / 2, PITCH.goalHeight / 2, goalY1);
  goalGroup.add(leftNet);
  
  const rightNet = new THREE.Mesh(sideNetGeo, netMat);
  rightNet.position.set((x + netX) / 2, PITCH.goalHeight / 2, goalY2);
  goalGroup.add(rightNet);
  
  // Top net
  const topNet = new THREE.Mesh(
    new THREE.PlaneGeometry(goalDepth, PITCH.goalWidth, 2, 8),
    netMat
  );
  topNet.rotation.x = Math.PI / 2;
  topNet.position.set((x + netX) / 2, PITCH.goalHeight, (goalY1 + goalY2) / 2);
  goalGroup.add(topNet);
  
  parent.add(goalGroup);
}

// ============================================
// SCENARIO LOADING
// ============================================
async function loadScenarios() {
  try {
    const response = await fetch('scenarios.json');
    State.scenarios = await response.json();
    console.log('Loaded scenarios:', Object.keys(State.scenarios));
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    State.scenarios = {};
  }
}

// ============================================
// UI SETUP
// ============================================
function setupUI() {
  const list = document.getElementById('scenarioList');
  
  // Populate scenario buttons
  Object.entries(State.scenarios).forEach(([key, scenario]) => {
    const btn = document.createElement('button');
    btn.className = 'scenario-btn';
    btn.textContent = scenario.name;
    btn.dataset.key = key;
    btn.addEventListener('click', () => loadScenario(key));
    list.appendChild(btn);
  });
  
  // Playback controls
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('timeline').addEventListener('click', onTimelineClick);
  
  // Labels toggle
  const labelsBtn = document.getElementById('labelsToggle');
  labelsBtn.classList.add('active'); // Labels on by default
  labelsBtn.addEventListener('click', () => {
    if (window.SceneManager) {
      window.SceneManager.toggleLabels(State.scene);
      labelsBtn.classList.toggle('active');
    }
  });
  
  // Camera presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      setCameraPreset(view);
      
      // Update active state
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/**
 * Sets camera to a preset view
 */
function setCameraPreset(preset) {
  const pitchCenterX = PITCH.length / 2;
  const pitchCenterZ = PITCH.width / 2;
  
  let targetX = pitchCenterX;
  let targetZ = pitchCenterZ;
  let radius, theta, phi;
  
  switch (preset) {
    case 'overview':
      // Angled overview from corner
      radius = 80;
      theta = Math.PI * 0.25;
      phi = Math.PI * 0.35;
      break;
      
    case 'side':
      // Side view along touchline
      radius = 60;
      theta = Math.PI * 0.5;
      phi = Math.PI * 0.4;
      break;
      
    case 'behind':
      // Behind attacking goal looking down pitch
      targetX = 15;
      radius = 40;
      theta = 0;
      phi = Math.PI * 0.35;
      break;
      
    case 'birdseye':
      // Top down view
      radius = 70;
      theta = 0;
      phi = 0.15;
      break;
      
    default:
      return;
  }
  
  // Animate to new position
  animateCameraPreset(targetX, targetZ, radius, theta, phi);
}

/**
 * Smoothly animates camera to preset position
 */
function animateCameraPreset(targetX, targetZ, radius, theta, phi) {
  const duration = 1000;
  const startTime = performance.now();
  
  const startTarget = State.controls.target.clone();
  const startRadius = State.controls.spherical.radius;
  const startTheta = State.controls.spherical.theta;
  const startPhi = State.controls.spherical.phi;
  
  const endTarget = new THREE.Vector3(targetX, 0, targetZ);
  
  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease in-out cubic
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    State.controls.target.lerpVectors(startTarget, endTarget, eased);
    State.controls.spherical.radius = startRadius + (radius - startRadius) * eased;
    
    // Handle angle interpolation
    let thetaDiff = theta - startTheta;
    if (thetaDiff > Math.PI) thetaDiff -= Math.PI * 2;
    if (thetaDiff < -Math.PI) thetaDiff += Math.PI * 2;
    State.controls.spherical.theta = startTheta + thetaDiff * eased;
    
    State.controls.spherical.phi = startPhi + (phi - startPhi) * eased;
    
    State.controls.update();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

function loadScenario(key) {
  const scenario = State.scenarios[key];
  if (!scenario) return;
  
  // Update UI
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.key === key);
  });
  
  document.getElementById('scenarioTitle').textContent = scenario.name;
  document.getElementById('scenarioDesc').textContent = scenario.desc;
  
  // Load sequence
  State.currentScenario = key;
  State.sequence = scenario.seq;
  State.currentStep = 0;
  
  // Enable controls
  document.getElementById('playBtn').disabled = false;
  
  // Render first step (no animation for initial load)
  renderStep(0, false);
}

function renderStep(index, animate = true) {
  if (!State.sequence[index]) return;
  
  const step = State.sequence[index];
  State.currentStep = index;
  
  // Update caption
  document.getElementById('stepCaption').textContent = step.caption || '';
  
  // Update step indicator
  document.getElementById('stepIndicator').textContent = 
    `${index + 1}/${State.sequence.length}`;
  
  // Update timeline
  document.getElementById('timelineProgress').style.width = 
    `${((index + 1) / State.sequence.length) * 100}%`;
  
  // Update button states
  document.getElementById('prevBtn').disabled = index <= 0;
  document.getElementById('nextBtn').disabled = index >= State.sequence.length - 1;
  
  // Move camera if viewbox specified
  if (step.vb && animate) {
    // Convert 2D viewbox to 3D camera position
    const centerX = step.vb.x + step.vb.w / 2;
    const centerZ = step.vb.y + step.vb.h / 2;
    const distance = Math.max(step.vb.w, step.vb.h) * 1.0;
    
    // Smoothly move camera target
    animateCameraTo(centerX, centerZ, distance);
  }
  
  // Render players and ball using SceneManager
  if (window.SceneManager) {
    window.SceneManager.renderStep(State.scene, step, animate);
  }
  
  console.log('Rendered step:', index, step.caption);
}

/**
 * Smoothly animates camera to new position
 */
function animateCameraTo(targetX, targetZ, distance) {
  const duration = 800;
  const startTarget = State.controls.target.clone();
  const startRadius = State.controls.spherical.radius;
  const startTime = performance.now();
  
  const endTarget = new THREE.Vector3(targetX, 0, targetZ);
  const endRadius = Math.max(25, Math.min(100, distance));
  
  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    
    State.controls.target.lerpVectors(startTarget, endTarget, eased);
    State.controls.spherical.radius = startRadius + (endRadius - startRadius) * eased;
    State.controls.update();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

// ============================================
// PLAYBACK CONTROLS
// ============================================
function prevStep() {
  if (State.currentStep > 0) {
    renderStep(State.currentStep - 1, true);
  }
}

function nextStep() {
  if (State.currentStep < State.sequence.length - 1) {
    renderStep(State.currentStep + 1, true);
  }
}

function togglePlay() {
  State.isPlaying = !State.isPlaying;
  
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  
  if (State.isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    
    // Start playback
    function advance() {
      if (State.currentStep < State.sequence.length - 1) {
        renderStep(State.currentStep + 1, true);
        const duration = State.sequence[State.currentStep]?.dur || 2500;
        State.playInterval = setTimeout(advance, duration);
      } else {
        stopPlayback();
      }
    }
    
    const duration = State.sequence[State.currentStep]?.dur || 2500;
    State.playInterval = setTimeout(advance, duration);
  } else {
    stopPlayback();
  }
}

function stopPlayback() {
  State.isPlaying = false;
  clearTimeout(State.playInterval);
  document.getElementById('playIcon').style.display = 'block';
  document.getElementById('pauseIcon').style.display = 'none';
}

function onTimelineClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const step = Math.floor(percent * State.sequence.length);
  renderStep(Math.max(0, Math.min(step, State.sequence.length - 1)), true);
}

// ============================================
// RENDER LOOP
// ============================================
function animate() {
  requestAnimationFrame(animate);
  
  const delta = State.clock.getDelta();
  const elapsed = State.clock.getElapsedTime();
  
  // Update animations
  State.animationMixers.forEach(mixer => mixer.update(delta));
  
  // Animate ground mist
  if (State.mist) {
    const positions = State.mist.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      // Gentle drift
      positions[i] += Math.sin(elapsed + i) * 0.01;
      positions[i + 1] = Math.abs(Math.sin(elapsed * 0.5 + i * 0.1)) * 2;
      
      // Wrap around pitch
      if (positions[i] > PITCH.length + 5) positions[i] = -5;
      if (positions[i] < -5) positions[i] = PITCH.length + 5;
    }
    State.mist.geometry.attributes.position.needsUpdate = true;
  }
  
  // Render
  State.renderer.render(State.scene, State.camera);
}

// ============================================
// RESIZE HANDLER
// ============================================
function onResize() {
  State.camera.aspect = window.innerWidth / window.innerHeight;
  State.camera.updateProjectionMatrix();
  State.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', init);
