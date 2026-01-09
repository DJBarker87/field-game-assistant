/**
 * Field Game 3D Visualizer
 * Clean, high-quality wireframe aesthetic
 */

// ============================================
// CONSTANTS
// ============================================
const PITCH = {
  length: 110,
  width: 75,
  goalLine: 0,
  threeYard: 3,
  fifteenYard: 15,
  halfway: 55,
  goalWidth: 12,    // Narrower - more square
  goalHeight: 12,   // Taller - about player height with arms up (2.4m * 5 scale)
  grassDark: 0x0d2818,
  grassLight: 0x0f3020,
  lineColor: 0x2a6a3a,
  lineOpacity: 0.6
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
  pitch: null,
  players: new Map(),
  ball: null,
  scenarios: {},
  currentScenario: null,
  sequence: [],
  currentStep: 0,
  isPlaying: false,
  playInterval: null,
  clock: null,
  animationMixers: []
};

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  console.log('Initializing Field Game 3D...');
  
  // Create scene - clean dark background
  State.scene = new THREE.Scene();
  State.scene.background = new THREE.Color(0x050a08);
  
  // Create camera
  State.camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  State.camera.position.set(55, 50, 85);
  State.camera.lookAt(55, 0, 37.5);
  
  // Create high-quality renderer
  const canvas = document.getElementById('canvas3d');
  State.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  State.renderer.setSize(window.innerWidth, window.innerHeight);
  State.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Clock for animations
  State.clock = new THREE.Clock();
  
  // Setup
  setupControls();
  setupLighting();
  createPitch();
  await loadScenarios();
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
  const camera = State.camera;
  const canvas = State.renderer.domElement;
  
  let isDragging = false;
  let isRightDrag = false;
  let previousMousePosition = { x: 0, y: 0 };
  
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
      const panSpeed = 0.1;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      camera.getWorldDirection(right);
      right.crossVectors(up, right).normalize();
      
      target.addScaledVector(right, -deltaX * panSpeed);
      target.y += deltaY * panSpeed;
      target.y = Math.max(0, Math.min(50, target.y));
    } else {
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
    spherical.radius = Math.max(15, Math.min(200, spherical.radius));
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
// LIGHTING - Minimal for wireframe style
// ============================================
function setupLighting() {
  // Soft ambient light
  const ambient = new THREE.AmbientLight(0x404040, 0.8);
  State.scene.add(ambient);
  
  // Subtle directional for depth
  const dir = new THREE.DirectionalLight(0xffffff, 0.3);
  dir.position.set(50, 80, 30);
  State.scene.add(dir);
}

// ============================================
// PITCH CREATION - Clean wireframe style
// ============================================
function createPitch() {
  const pitchGroup = new THREE.Group();
  pitchGroup.name = 'pitch';
  
  // Ground plane - very subtle
  const groundGeo = new THREE.PlaneGeometry(PITCH.length + 20, PITCH.width + 20);
  const groundMat = new THREE.MeshBasicMaterial({
    color: 0x050a08,
    transparent: true,
    opacity: 1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(PITCH.length / 2, -0.01, PITCH.width / 2);
  pitchGroup.add(ground);
  
  // Pitch surface with subtle grid
  const pitchGeo = new THREE.PlaneGeometry(PITCH.length, PITCH.width, 22, 15);
  const pitchMat = new THREE.MeshBasicMaterial({
    color: 0x0a1810,
    wireframe: false,
    transparent: true,
    opacity: 0.95
  });
  const pitchSurface = new THREE.Mesh(pitchGeo, pitchMat);
  pitchSurface.rotation.x = -Math.PI / 2;
  pitchSurface.position.set(PITCH.length / 2, 0, PITCH.width / 2);
  pitchGroup.add(pitchSurface);
  
  // Grid overlay
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x1a3020,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  const grid = new THREE.Mesh(pitchGeo.clone(), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(PITCH.length / 2, 0.01, PITCH.width / 2);
  pitchGroup.add(grid);
  
  // Create pitch lines
  createPitchLines(pitchGroup);
  
  // Create goals
  createGoal(pitchGroup, 0, -1);      // Left goal
  createGoal(pitchGroup, PITCH.length, 1);  // Right goal
  
  State.scene.add(pitchGroup);
  State.pitch = pitchGroup;
}

function createPitchLines(parent) {
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x3a8a4a,
    transparent: true,
    opacity: 0.7,
    linewidth: 2
  });
  
  const lines = new THREE.Group();
  lines.name = 'pitchLines';
  
  // Helper to create line
  function addLine(x1, z1, x2, z2, dashed = false) {
    const points = [
      new THREE.Vector3(x1, 0.02, z1),
      new THREE.Vector3(x2, 0.02, z2)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    let mat = lineMaterial;
    if (dashed) {
      mat = new THREE.LineDashedMaterial({
        color: 0x3a8a4a,
        transparent: true,
        opacity: 0.5,
        dashSize: 1.5,
        gapSize: 1.5
      });
    }
    
    const line = new THREE.Line(geometry, mat);
    if (dashed) line.computeLineDistances();
    lines.add(line);
  }
  
  // Touchlines (long edges)
  addLine(0, 0, PITCH.length, 0);
  addLine(0, PITCH.width, PITCH.length, PITCH.width);
  
  // Goal lines
  addLine(0, 0, 0, PITCH.width);
  addLine(PITCH.length, 0, PITCH.length, PITCH.width);
  
  // Halfway line
  addLine(PITCH.halfway, 0, PITCH.halfway, PITCH.width);
  
  // 15-yard lines
  addLine(PITCH.fifteenYard, 0, PITCH.fifteenYard, PITCH.width);
  addLine(PITCH.length - PITCH.fifteenYard, 0, PITCH.length - PITCH.fifteenYard, PITCH.width);
  
  // 3-yard lines (dashed)
  addLine(PITCH.threeYard, 0, PITCH.threeYard, PITCH.width, true);
  addLine(PITCH.length - PITCH.threeYard, 0, PITCH.length - PITCH.threeYard, PITCH.width, true);
  
  // Tramlines (dashed, at 1/4 and 3/4 width)
  const tramY1 = PITCH.width * 0.25;
  const tramY2 = PITCH.width * 0.75;
  addLine(0, tramY1, PITCH.length, tramY1, true);
  addLine(0, tramY2, PITCH.length, tramY2, true);
  
  parent.add(lines);
}

function createGoal(parent, x, direction) {
  const goalGroup = new THREE.Group();
  goalGroup.name = 'goal';
  
  const goalY1 = (PITCH.width - PITCH.goalWidth) / 2;
  const goalY2 = (PITCH.width + PITCH.goalWidth) / 2;
  
  // Goal frame - wireframe style
  const postMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });
  
  const postInnerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15
  });
  
  const postRadius = 0.08;
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, PITCH.goalHeight, 12);
  
  // Left post
  const leftPost = new THREE.Mesh(postGeo, postMaterial);
  leftPost.position.set(x, PITCH.goalHeight / 2, goalY1);
  goalGroup.add(leftPost);
  
  const leftPostInner = new THREE.Mesh(postGeo.clone(), postInnerMaterial);
  leftPostInner.position.copy(leftPost.position);
  goalGroup.add(leftPostInner);
  
  // Right post
  const rightPost = new THREE.Mesh(postGeo, postMaterial);
  rightPost.position.set(x, PITCH.goalHeight / 2, goalY2);
  goalGroup.add(rightPost);
  
  const rightPostInner = new THREE.Mesh(postGeo.clone(), postInnerMaterial);
  rightPostInner.position.copy(rightPost.position);
  goalGroup.add(rightPostInner);
  
  // Crossbar
  const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, PITCH.goalWidth, 12);
  const crossbar = new THREE.Mesh(crossbarGeo, postMaterial);
  crossbar.rotation.x = Math.PI / 2;
  crossbar.position.set(x, PITCH.goalHeight, (goalY1 + goalY2) / 2);
  goalGroup.add(crossbar);
  
  const crossbarInner = new THREE.Mesh(crossbarGeo.clone(), postInnerMaterial);
  crossbarInner.rotation.x = Math.PI / 2;
  crossbarInner.position.copy(crossbar.position);
  goalGroup.add(crossbarInner);
  
  // Net - wireframe grid
  const netDepth = 2;
  const netX = x + (direction * netDepth);
  
  const netMaterial = new THREE.MeshBasicMaterial({
    color: 0x4a9a5a,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  
  // Back net
  const backNetGeo = new THREE.PlaneGeometry(PITCH.goalWidth, PITCH.goalHeight, 8, 4);
  const backNet = new THREE.Mesh(backNetGeo, netMaterial);
  backNet.rotation.y = Math.PI / 2;
  backNet.position.set(netX, PITCH.goalHeight / 2, (goalY1 + goalY2) / 2);
  goalGroup.add(backNet);
  
  // Side nets
  const sideNetGeo = new THREE.PlaneGeometry(netDepth, PITCH.goalHeight, 2, 4);
  
  const leftSideNet = new THREE.Mesh(sideNetGeo, netMaterial);
  leftSideNet.position.set((x + netX) / 2, PITCH.goalHeight / 2, goalY1);
  goalGroup.add(leftSideNet);
  
  const rightSideNet = new THREE.Mesh(sideNetGeo, netMaterial);
  rightSideNet.position.set((x + netX) / 2, PITCH.goalHeight / 2, goalY2);
  goalGroup.add(rightSideNet);
  
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
  
  Object.entries(State.scenarios).forEach(([key, scenario]) => {
    const btn = document.createElement('button');
    btn.className = 'scenario-btn';
    btn.textContent = scenario.name;
    btn.dataset.key = key;
    btn.addEventListener('click', () => loadScenario(key));
    list.appendChild(btn);
  });
  
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('timeline').addEventListener('click', onTimelineClick);
  
  const labelsBtn = document.getElementById('labelsToggle');
  labelsBtn.classList.add('active');
  labelsBtn.addEventListener('click', () => {
    if (window.SceneManager) {
      window.SceneManager.toggleLabels(State.scene);
      labelsBtn.classList.toggle('active');
    }
  });
  
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      setCameraPreset(view);
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function setCameraPreset(preset) {
  const pitchCenterX = PITCH.length / 2;
  const pitchCenterZ = PITCH.width / 2;
  
  let targetX = pitchCenterX;
  let targetZ = pitchCenterZ;
  let radius, theta, phi;
  
  switch (preset) {
    case 'overview':
      radius = 70;
      theta = Math.PI * 0.25;
      phi = Math.PI * 0.35;
      break;
    case 'side':
      radius = 55;
      theta = Math.PI * 0.5;
      phi = Math.PI * 0.4;
      break;
    case 'behind':
      targetX = 15;
      radius = 35;
      theta = 0;
      phi = Math.PI * 0.35;
      break;
    case 'birdseye':
      radius = 65;
      theta = 0;
      phi = 0.12;
      break;
    default:
      return;
  }
  
  animateCameraPreset(targetX, targetZ, radius, theta, phi);
}

function animateCameraPreset(targetX, targetZ, radius, theta, phi) {
  const duration = 1000;
  const startTime = performance.now();
  
  const startTarget = State.controls.target.clone();
  const startRadius = State.controls.spherical.radius;
  const startTheta = State.controls.spherical.theta;
  const startPhi = State.controls.spherical.phi;
  
  const endTarget = new THREE.Vector3(targetX, 0, targetZ);
  
  function anim() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    State.controls.target.lerpVectors(startTarget, endTarget, eased);
    State.controls.spherical.radius = startRadius + (radius - startRadius) * eased;
    
    let thetaDiff = theta - startTheta;
    if (thetaDiff > Math.PI) thetaDiff -= Math.PI * 2;
    if (thetaDiff < -Math.PI) thetaDiff += Math.PI * 2;
    State.controls.spherical.theta = startTheta + thetaDiff * eased;
    State.controls.spherical.phi = startPhi + (phi - startPhi) * eased;
    
    State.controls.update();
    
    if (progress < 1) requestAnimationFrame(anim);
  }
  
  anim();
}

// ============================================
// SCENARIO PLAYBACK
// ============================================
function loadScenario(key) {
  const scenario = State.scenarios[key];
  if (!scenario) return;
  
  State.currentScenario = key;
  State.sequence = scenario.seq;
  State.currentStep = 0;
  
  // Update UI
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.key === key);
  });
  
  document.getElementById('scenarioTitle').textContent = scenario.name;
  document.getElementById('scenarioDesc').textContent = scenario.desc;
  
  // Clear existing scene objects
  if (window.SceneManager) {
    window.SceneManager.clear(State.scene);
  }
  
  renderStep(0, false);
}

function renderStep(index, animate = true) {
  if (!State.sequence[index]) return;
  
  const step = State.sequence[index];
  State.currentStep = index;
  
  document.getElementById('stepCaption').textContent = step.caption || '';
  document.getElementById('stepIndicator').textContent = `${index + 1}/${State.sequence.length}`;
  document.getElementById('timelineProgress').style.width = `${((index + 1) / State.sequence.length) * 100}%`;
  
  document.getElementById('prevBtn').disabled = index <= 0;
  document.getElementById('nextBtn').disabled = index >= State.sequence.length - 1;
  
  if (step.vb && animate) {
    const centerX = step.vb.x + step.vb.w / 2;
    const centerZ = step.vb.y + step.vb.h / 2;
    const distance = Math.max(step.vb.w, step.vb.h) * 0.9;
    animateCameraTo(centerX, centerZ, distance);
  }
  
  if (window.SceneManager) {
    window.SceneManager.renderStep(State.scene, step, animate);
  }
}

function animateCameraTo(targetX, targetZ, distance) {
  const duration = 800;
  const startTarget = State.controls.target.clone();
  const startRadius = State.controls.spherical.radius;
  const startTime = performance.now();
  
  const endTarget = new THREE.Vector3(targetX, 0, targetZ);
  const endRadius = Math.max(20, Math.min(90, distance));
  
  function anim() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    
    State.controls.target.lerpVectors(startTarget, endTarget, eased);
    State.controls.spherical.radius = startRadius + (endRadius - startRadius) * eased;
    State.controls.update();
    
    if (progress < 1) requestAnimationFrame(anim);
  }
  
  anim();
}

// ============================================
// PLAYBACK CONTROLS
// ============================================
function prevStep() {
  if (State.currentStep > 0) renderStep(State.currentStep - 1, true);
}

function nextStep() {
  if (State.currentStep < State.sequence.length - 1) renderStep(State.currentStep + 1, true);
}

function togglePlay() {
  State.isPlaying = !State.isPlaying;
  
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  
  if (State.isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    
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
  State.animationMixers.forEach(mixer => mixer.update(delta));
  
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
