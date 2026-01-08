/**
 * Field Game 3D - Player Figures v2
 * Part 4: Proper bully binding with arms around adjacent players
 * 
 * Poses:
 * 1. run_ball - Running with ball at feet
 * 2. run_noBall - Running without ball  
 * 3. bully_crouch - Crouched in bully (attacking), bound to neighbors, head low
 * 4. bully_stand - Standing in bully (defending), bound to neighbors
 * 
 * Bully Binding Rules:
 * - Arms wrap around adjacent teammates' backs
 * - Forearm (beyond elbow) must touch the teammate
 * - Crouching players' heads go between standing players' hips
 * - Front row is perfectly horizontal (all 6 players in line)
 */

// Player dimensions (in meters, realistic teen proportions)
const PLAYER_CONFIG = {
  height: 1.7,           // Total height when standing
  headRadius: 0.11,
  neckLength: 0.07,
  torsoHeight: 0.52,
  torsoWidth: 0.36,
  torsoDepth: 0.22,
  hipWidth: 0.32,
  hipHeight: 0.15,       // Hip area for crouched heads to fit between
  shoulderWidth: 0.42,
  upperArmLength: 0.28,
  lowerArmLength: 0.26,
  armRadius: 0.04,
  upperLegLength: 0.42,
  lowerLegLength: 0.40,
  legRadius: 0.055,
  footLength: 0.24,
  footHeight: 0.07,
  
  // Bully-specific
  crouchHeight: 0.75,    // How high off ground when crouched
  bindingArmAngle: 1.2,  // Angle arms go out for binding (radians)
};

// ============================================
// MAIN FACTORY FUNCTION
// ============================================

/**
 * Creates a complete player figure group with the specified pose
 */
function createPlayerFigure(pose = 'run_noBall', color = 0x2980b9, highlighted = false, highlightPart = null) {
  const group = new THREE.Group();
  group.name = 'player';
  
  // Store metadata
  group.userData = { pose, color, highlighted, highlightPart };
  
  // Create materials
  const materials = createPlayerMaterials(color, highlighted, highlightPart);
  
  // Build the figure based on pose
  switch (pose) {
    case 'run_ball':
      buildRunningPose(group, materials, true);
      break;
    case 'run_noBall':
      buildRunningPose(group, materials, false);
      break;
    case 'bully_crouch':
      buildBullyCrouchPose(group, materials);
      break;
    case 'bully_stand':
      buildBullyStandPose(group, materials);
      break;
    default:
      buildRunningPose(group, materials, false);
  }
  
  // Add highlight glow effect for highlighted players
  if (highlighted) {
    addPlayerGlow(group, color);
  }
  
  return group;
}

/**
 * Creates the material set for a player
 */
function createPlayerMaterials(color, highlighted, highlightPart) {
  // Base translucent material
  const baseMaterial = new THREE.MeshPhysicalMaterial({
    color: color,
    transparent: true,
    opacity: highlighted ? 0.85 : 0.45,
    roughness: 0.5,
    metalness: 0.05,
    transmission: highlighted ? 0.1 : 0.4,
    thickness: 0.3,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  
  // Highlighted/glowing material for specific body parts
  const glowMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 1.0,
    roughness: 0.2,
    metalness: 0.2,
    emissive: 0xf1c40f,
    emissiveIntensity: 0.6,
    side: THREE.DoubleSide
  });
  
  return {
    body: baseMaterial,
    glow: glowMaterial,
    highlightPart: highlightPart,
    color: color,
    highlighted: highlighted
  };
}

/**
 * Adds a glow sphere around highlighted player
 */
function addPlayerGlow(group, color) {
  const glowGeo = new THREE.SphereGeometry(1.2, 16, 12);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 0.85;
  glow.name = 'playerGlow';
  group.add(glow);
}

// ============================================
// RUNNING POSES
// ============================================

function buildRunningPose(group, materials, hasBall) {
  const P = PLAYER_CONFIG;
  const torsoLean = 0.18;
  
  // Calculate positions
  const torsoY = P.upperLegLength + P.lowerLegLength + P.torsoHeight / 2;
  const headY = torsoY + P.torsoHeight / 2 + P.neckLength + P.headRadius;
  
  // === TORSO ===
  const torso = createTorso(materials);
  torso.rotation.x = torsoLean;
  torso.position.y = torsoY;
  torso.position.z = -Math.sin(torsoLean) * P.torsoHeight * 0.3;
  group.add(torso);
  
  // === HEAD ===
  const head = createHead(materials);
  head.position.y = headY;
  head.position.z = -Math.sin(torsoLean) * P.torsoHeight * 0.5;
  group.add(head);
  
  // === ARMS (running motion) ===
  const shoulderY = torsoY + P.torsoHeight * 0.4;
  
  // Right arm forward
  const rightArm = createArm(materials, 'right');
  rightArm.rotation.x = -0.9;
  rightArm.rotation.z = 0.15;
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, -Math.sin(torsoLean) * P.torsoHeight * 0.3);
  group.add(rightArm);
  
  // Left arm back
  const leftArm = createArm(materials, 'left');
  leftArm.rotation.x = 0.7;
  leftArm.rotation.z = -0.15;
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, -Math.sin(torsoLean) * P.torsoHeight * 0.3);
  group.add(leftArm);
  
  // === LEGS ===
  const hipY = torsoY - P.torsoHeight / 2;
  
  // Right leg back
  const rightLeg = createLeg(materials, 'right');
  rightLeg.rotation.x = 0.6;
  rightLeg.position.set(-P.hipWidth / 2, hipY, 0);
  group.add(rightLeg);
  
  // Left leg forward
  const leftLeg = createLeg(materials, 'left');
  leftLeg.rotation.x = -0.5;
  leftLeg.position.set(P.hipWidth / 2, hipY, 0);
  group.add(leftLeg);
  
  // === BALL ===
  if (hasBall) {
    const ball = createBall();
    ball.position.set(0.15, 0.11, -0.5);
    group.add(ball);
  }
}

// ============================================
// BULLY POSES - THE KEY PART
// ============================================

/**
 * Crouched bully pose (attacking team)
 * - Body bent forward nearly horizontal
 * - Head low (between standing defenders' hips)
 * - Arms extended sideways and back for binding to neighbors
 * - Legs bent, feet planted
 */
function buildBullyCrouchPose(group, materials) {
  const P = PLAYER_CONFIG;
  
  // Crouch configuration
  const bodyAngle = Math.PI * 0.42;  // About 75 degrees forward lean
  const headHeight = 0.55;           // Head height - low enough to go between standing hips
  const torsoHeight = 0.70;          // Torso center height
  
  // === TORSO (nearly horizontal) ===
  const torso = createTorso(materials);
  torso.rotation.x = bodyAngle;
  torso.position.y = torsoHeight;
  torso.position.z = -0.25;
  group.add(torso);
  
  // === HEAD (tucked low) ===
  const head = createHead(materials);
  head.position.y = headHeight;
  head.position.z = -0.55;  // Head projects forward
  head.rotation.x = 0.3;    // Looking slightly down
  group.add(head);
  
  // === ARMS (binding position - wrapped around neighbors) ===
  // Arms go out to the sides and curve backward to wrap around adjacent players
  const shoulderY = torsoHeight + 0.15;
  const shoulderZ = -0.15;
  
  // Right arm - reaching to the right to bind with neighbor
  const rightArm = createBindingArm(materials, 'right');
  rightArm.position.set(-P.shoulderWidth / 2 - 0.05, shoulderY, shoulderZ);
  group.add(rightArm);
  
  // Left arm - reaching to the left to bind with neighbor
  const leftArm = createBindingArm(materials, 'left');
  leftArm.position.set(P.shoulderWidth / 2 + 0.05, shoulderY, shoulderZ);
  group.add(leftArm);
  
  // === LEGS (bent, supporting crouch) ===
  const hipY = torsoHeight - 0.2;
  
  const rightLeg = createCrouchedLeg(materials, 'right');
  rightLeg.position.set(-P.hipWidth / 2, hipY, 0.1);
  group.add(rightLeg);
  
  const leftLeg = createCrouchedLeg(materials, 'left');
  leftLeg.position.set(P.hipWidth / 2, hipY, 0.1);
  group.add(leftLeg);
}

/**
 * Standing bully pose (defending team)
 * - Upright stance but leaning slightly forward
 * - Arms out to sides binding with neighbors
 * - Legs apart for stability
 * - Hips at height where crouched players' heads fit between
 */
function buildBullyStandPose(group, materials) {
  const P = PLAYER_CONFIG;
  
  // Standing configuration
  const legLength = P.upperLegLength + P.lowerLegLength;
  const torsoY = legLength + P.torsoHeight / 2;
  const headY = torsoY + P.torsoHeight / 2 + P.neckLength + P.headRadius;
  const hipY = legLength;  // This is where crouched heads go between
  
  // === TORSO (slight forward lean for engagement) ===
  const torso = createTorso(materials);
  torso.rotation.x = 0.15;  // Slight lean
  torso.position.y = torsoY;
  torso.position.z = -0.05;
  group.add(torso);
  
  // === HEAD ===
  const head = createHead(materials);
  head.position.y = headY;
  head.position.z = -0.08;
  group.add(head);
  
  // === ARMS (binding position - out to sides, wrapping neighbors) ===
  const shoulderY = torsoY + P.torsoHeight * 0.35;
  
  // Right arm
  const rightArm = createBindingArmStanding(materials, 'right');
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, -0.03);
  group.add(rightArm);
  
  // Left arm
  const leftArm = createBindingArmStanding(materials, 'left');
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, -0.03);
  group.add(leftArm);
  
  // === LEGS (apart for stability) ===
  const rightLeg = createLeg(materials, 'right');
  rightLeg.rotation.z = 0.12;  // Legs spread
  rightLeg.position.set(-P.hipWidth / 2 - 0.06, hipY, 0);
  group.add(rightLeg);
  
  const leftLeg = createLeg(materials, 'left');
  leftLeg.rotation.z = -0.12;
  leftLeg.position.set(P.hipWidth / 2 + 0.06, hipY, 0);
  group.add(leftLeg);
}

// ============================================
// BINDING ARM CREATION
// ============================================

/**
 * Creates an arm in binding position for crouched player
 * Arm extends sideways and curves back to wrap around neighbor's back
 */
function createBindingArm(materials, side) {
  const P = PLAYER_CONFIG;
  const armGroup = new THREE.Group();
  armGroup.name = side + '_arm_binding';
  
  const isRight = side === 'right';
  const sideSign = isRight ? -1 : 1;
  const isHighlightHand = materials.highlightPart === 'hand';
  
  // Upper arm - extends outward and slightly back
  const upperArmGeo = new THREE.CylinderGeometry(P.armRadius, P.armRadius * 1.1, P.upperArmLength, 8);
  const upperArm = new THREE.Mesh(upperArmGeo, materials.body);
  upperArm.rotation.z = sideSign * 1.3;  // Arm out to side
  upperArm.rotation.x = 0.4;              // Slightly back
  upperArm.position.set(sideSign * P.upperArmLength * 0.4, 0, 0.1);
  upperArm.castShadow = true;
  armGroup.add(upperArm);
  
  // Elbow position (where upper arm ends)
  const elbowX = sideSign * (P.upperArmLength * 0.85);
  const elbowY = -0.08;
  const elbowZ = 0.15;
  
  // Elbow joint
  const elbowGeo = new THREE.SphereGeometry(P.armRadius * 1.15, 8, 6);
  const elbow = new THREE.Mesh(elbowGeo, materials.body);
  elbow.position.set(elbowX, elbowY, elbowZ);
  armGroup.add(elbow);
  
  // Lower arm - curves backward to wrap around neighbor
  // This creates the "forearm on back" binding
  const lowerArmGroup = new THREE.Group();
  lowerArmGroup.position.set(elbowX, elbowY, elbowZ);
  
  const lowerArmGeo = new THREE.CylinderGeometry(P.armRadius * 0.9, P.armRadius, P.lowerArmLength, 8);
  const lowerArm = new THREE.Mesh(lowerArmGeo, materials.body);
  lowerArm.rotation.z = sideSign * 0.3;  // Angle inward
  lowerArm.rotation.x = 0.8;              // Curve backward
  lowerArm.position.set(sideSign * 0.08, -0.05, P.lowerArmLength * 0.4);
  lowerArm.castShadow = true;
  lowerArmGroup.add(lowerArm);
  
  // Hand - gripping neighbor's kit
  const handGeo = new THREE.SphereGeometry(P.armRadius * 1.4, 8, 6);
  handGeo.scale(1, 0.7, 0.9);
  const handMat = isHighlightHand ? materials.glow : materials.body;
  const hand = new THREE.Mesh(handGeo, handMat);
  hand.position.set(sideSign * 0.12, -0.08, P.lowerArmLength * 0.75);
  hand.name = 'hand';
  hand.castShadow = true;
  lowerArmGroup.add(hand);
  
  // Glow for highlighted hand
  if (isHighlightHand) {
    const glowGeo = new THREE.SphereGeometry(P.armRadius * 3, 12, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.35
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(hand.position);
    lowerArmGroup.add(glow);
  }
  
  armGroup.add(lowerArmGroup);
  
  return armGroup;
}

/**
 * Creates an arm in binding position for standing player
 */
function createBindingArmStanding(materials, side) {
  const P = PLAYER_CONFIG;
  const armGroup = new THREE.Group();
  armGroup.name = side + '_arm_binding_stand';
  
  const isRight = side === 'right';
  const sideSign = isRight ? -1 : 1;
  const isHighlightHand = materials.highlightPart === 'hand';
  
  // Upper arm - extends outward and down
  const upperArmGeo = new THREE.CylinderGeometry(P.armRadius, P.armRadius * 1.1, P.upperArmLength, 8);
  const upperArm = new THREE.Mesh(upperArmGeo, materials.body);
  upperArm.rotation.z = sideSign * 1.1;  // Arm out to side
  upperArm.rotation.x = 0.2;
  upperArm.position.set(sideSign * P.upperArmLength * 0.35, -P.upperArmLength * 0.3, 0);
  upperArm.castShadow = true;
  armGroup.add(upperArm);
  
  // Elbow position
  const elbowX = sideSign * (P.upperArmLength * 0.75);
  const elbowY = -P.upperArmLength * 0.55;
  const elbowZ = 0.05;
  
  // Elbow joint
  const elbowGeo = new THREE.SphereGeometry(P.armRadius * 1.15, 8, 6);
  const elbow = new THREE.Mesh(elbowGeo, materials.body);
  elbow.position.set(elbowX, elbowY, elbowZ);
  armGroup.add(elbow);
  
  // Lower arm - wraps around behind neighbor
  const lowerArmGroup = new THREE.Group();
  lowerArmGroup.position.set(elbowX, elbowY, elbowZ);
  
  const lowerArmGeo = new THREE.CylinderGeometry(P.armRadius * 0.9, P.armRadius, P.lowerArmLength, 8);
  const lowerArm = new THREE.Mesh(lowerArmGeo, materials.body);
  lowerArm.rotation.z = sideSign * (-0.5);  // Curve around
  lowerArm.rotation.x = 0.5;
  lowerArm.position.set(sideSign * 0.05, -0.1, P.lowerArmLength * 0.35);
  lowerArm.castShadow = true;
  lowerArmGroup.add(lowerArm);
  
  // Hand
  const handGeo = new THREE.SphereGeometry(P.armRadius * 1.4, 8, 6);
  handGeo.scale(1, 0.7, 0.9);
  const handMat = isHighlightHand ? materials.glow : materials.body;
  const hand = new THREE.Mesh(handGeo, handMat);
  hand.position.set(sideSign * 0.02, -0.18, P.lowerArmLength * 0.6);
  hand.name = 'hand';
  hand.castShadow = true;
  lowerArmGroup.add(hand);
  
  if (isHighlightHand) {
    const glowGeo = new THREE.SphereGeometry(P.armRadius * 3, 12, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.35
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(hand.position);
    lowerArmGroup.add(glow);
  }
  
  armGroup.add(lowerArmGroup);
  
  return armGroup;
}

// ============================================
// BODY PARTS
// ============================================

function createHead(materials) {
  const P = PLAYER_CONFIG;
  const headGroup = new THREE.Group();
  headGroup.name = 'head';
  
  const isHighlight = materials.highlightPart === 'head';
  
  // Main head
  const headGeo = new THREE.SphereGeometry(P.headRadius, 16, 12);
  const headMesh = new THREE.Mesh(headGeo, isHighlight ? materials.glow : materials.body);
  headMesh.castShadow = true;
  headGroup.add(headMesh);
  
  // Neck
  const neckGeo = new THREE.CylinderGeometry(P.headRadius * 0.45, P.headRadius * 0.55, P.neckLength, 8);
  const neckMesh = new THREE.Mesh(neckGeo, materials.body);
  neckMesh.position.y = -P.headRadius - P.neckLength / 2;
  neckMesh.castShadow = true;
  headGroup.add(neckMesh);
  
  // Glow for highlighted head
  if (isHighlight) {
    const glowGeo = new THREE.SphereGeometry(P.headRadius * 2, 12, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    headGroup.add(glow);
  }
  
  return headGroup;
}

function createTorso(materials) {
  const P = PLAYER_CONFIG;
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torso';
  
  // Create tapered torso shape
  const torsoShape = new THREE.Shape();
  const hw = P.torsoWidth / 2;
  const sw = P.shoulderWidth / 2;
  const hh = P.torsoHeight / 2;
  
  torsoShape.moveTo(-hw * 0.9, -hh);
  torsoShape.lineTo(-sw, hh * 0.7);
  torsoShape.quadraticCurveTo(-sw * 1.05, hh, 0, hh);
  torsoShape.quadraticCurveTo(sw * 1.05, hh, sw, hh * 0.7);
  torsoShape.lineTo(hw * 0.9, -hh);
  torsoShape.quadraticCurveTo(0, -hh * 1.1, -hw * 0.9, -hh);
  
  const extrudeSettings = {
    steps: 1,
    depth: P.torsoDepth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2
  };
  
  const torsoGeo = new THREE.ExtrudeGeometry(torsoShape, extrudeSettings);
  torsoGeo.center();
  
  const torsoMesh = new THREE.Mesh(torsoGeo, materials.body);
  torsoMesh.rotation.x = Math.PI / 2;
  torsoMesh.castShadow = true;
  torsoGroup.add(torsoMesh);
  
  return torsoGroup;
}

function createArm(materials, side) {
  const P = PLAYER_CONFIG;
  const armGroup = new THREE.Group();
  armGroup.name = side + '_arm';
  
  const isHighlightHand = materials.highlightPart === 'hand';
  
  // Upper arm
  const upperArmGeo = new THREE.CylinderGeometry(P.armRadius, P.armRadius * 1.1, P.upperArmLength, 8);
  const upperArm = new THREE.Mesh(upperArmGeo, materials.body);
  upperArm.position.y = -P.upperArmLength / 2;
  upperArm.castShadow = true;
  armGroup.add(upperArm);
  
  // Elbow
  const elbowGeo = new THREE.SphereGeometry(P.armRadius * 1.1, 8, 6);
  const elbow = new THREE.Mesh(elbowGeo, materials.body);
  elbow.position.y = -P.upperArmLength;
  armGroup.add(elbow);
  
  // Lower arm
  const lowerArmGeo = new THREE.CylinderGeometry(P.armRadius * 0.85, P.armRadius, P.lowerArmLength, 8);
  const lowerArm = new THREE.Mesh(lowerArmGeo, materials.body);
  lowerArm.position.y = -P.upperArmLength - P.lowerArmLength / 2;
  lowerArm.castShadow = true;
  armGroup.add(lowerArm);
  
  // Hand
  const handGeo = new THREE.SphereGeometry(P.armRadius * 1.3, 8, 6);
  handGeo.scale(1, 0.65, 0.85);
  const handMat = isHighlightHand ? materials.glow : materials.body;
  const hand = new THREE.Mesh(handGeo, handMat);
  hand.position.y = -P.upperArmLength - P.lowerArmLength - P.armRadius;
  hand.name = 'hand';
  hand.castShadow = true;
  armGroup.add(hand);
  
  if (isHighlightHand) {
    const glowGeo = new THREE.SphereGeometry(P.armRadius * 2.8, 12, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = hand.position.y;
    armGroup.add(glow);
  }
  
  return armGroup;
}

function createLeg(materials, side) {
  const P = PLAYER_CONFIG;
  const legGroup = new THREE.Group();
  legGroup.name = side + '_leg';
  
  const isHighlightFoot = materials.highlightPart === 'foot';
  
  // Upper leg
  const thighGeo = new THREE.CylinderGeometry(P.legRadius * 1.25, P.legRadius * 1.05, P.upperLegLength, 8);
  const thigh = new THREE.Mesh(thighGeo, materials.body);
  thigh.position.y = -P.upperLegLength / 2;
  thigh.castShadow = true;
  legGroup.add(thigh);
  
  // Knee
  const kneeGeo = new THREE.SphereGeometry(P.legRadius * 1.1, 8, 6);
  const knee = new THREE.Mesh(kneeGeo, materials.body);
  knee.position.y = -P.upperLegLength;
  legGroup.add(knee);
  
  // Lower leg
  const shinGeo = new THREE.CylinderGeometry(P.legRadius, P.legRadius * 0.85, P.lowerLegLength, 8);
  const shin = new THREE.Mesh(shinGeo, materials.body);
  shin.position.y = -P.upperLegLength - P.lowerLegLength / 2;
  shin.castShadow = true;
  legGroup.add(shin);
  
  // Foot
  const footGeo = new THREE.BoxGeometry(P.legRadius * 2.2, P.footHeight, P.footLength);
  const footMat = isHighlightFoot ? materials.glow : materials.body;
  const foot = new THREE.Mesh(footGeo, footMat);
  foot.position.y = -P.upperLegLength - P.lowerLegLength - P.footHeight / 2 + 0.01;
  foot.position.z = -P.footLength * 0.15;
  foot.name = 'foot';
  foot.castShadow = true;
  legGroup.add(foot);
  
  if (isHighlightFoot) {
    const glowGeo = new THREE.SphereGeometry(P.footLength * 0.5, 12, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(foot.position);
    legGroup.add(glow);
  }
  
  return legGroup;
}

function createCrouchedLeg(materials, side) {
  const P = PLAYER_CONFIG;
  const legGroup = new THREE.Group();
  legGroup.name = side + '_leg_crouch';
  
  // Upper leg - angled back
  const thighGeo = new THREE.CylinderGeometry(P.legRadius * 1.25, P.legRadius * 1.05, P.upperLegLength, 8);
  const thigh = new THREE.Mesh(thighGeo, materials.body);
  thigh.rotation.x = 0.9;  // Angled back
  thigh.position.y = -P.upperLegLength * 0.35;
  thigh.position.z = P.upperLegLength * 0.25;
  thigh.castShadow = true;
  legGroup.add(thigh);
  
  // Knee position
  const kneeY = -P.upperLegLength * 0.6;
  const kneeZ = P.upperLegLength * 0.55;
  
  const kneeGeo = new THREE.SphereGeometry(P.legRadius * 1.1, 8, 6);
  const knee = new THREE.Mesh(kneeGeo, materials.body);
  knee.position.set(0, kneeY, kneeZ);
  legGroup.add(knee);
  
  // Lower leg - angled forward (bent knee)
  const shinGroup = new THREE.Group();
  shinGroup.position.set(0, kneeY, kneeZ);
  shinGroup.rotation.x = -1.5;  // Bent forward
  
  const shinGeo = new THREE.CylinderGeometry(P.legRadius, P.legRadius * 0.85, P.lowerLegLength, 8);
  const shin = new THREE.Mesh(shinGeo, materials.body);
  shin.position.y = -P.lowerLegLength / 2;
  shin.castShadow = true;
  shinGroup.add(shin);
  
  // Foot
  const footGeo = new THREE.BoxGeometry(P.legRadius * 2.2, P.footHeight, P.footLength);
  const foot = new THREE.Mesh(footGeo, materials.body);
  foot.position.y = -P.lowerLegLength - P.footHeight / 2 + 0.01;
  foot.position.z = -P.footLength * 0.15;
  foot.rotation.x = 1.5;  // Flat on ground
  foot.castShadow = true;
  shinGroup.add(foot);
  
  legGroup.add(shinGroup);
  
  return legGroup;
}

// ============================================
// BALL
// ============================================

function createBall() {
  const ballGroup = new THREE.Group();
  ballGroup.name = 'football';
  
  const ballGeo = new THREE.SphereGeometry(0.11, 16, 12);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xf1c40f,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0xf1c40f,
    emissiveIntensity: 0.15
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.castShadow = true;
  ballGroup.add(ball);
  
  // Glow
  const glowGeo = new THREE.SphereGeometry(0.16, 12, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.25
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  ballGroup.add(glow);
  
  return ballGroup;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updatePlayerHighlight(playerGroup, highlighted, highlightPart = null) {
  const color = playerGroup.userData.color || 0x2980b9;
  const newMaterials = createPlayerMaterials(color, highlighted, highlightPart);
  
  // Update existing meshes
  playerGroup.traverse((child) => {
    if (child.isMesh && child.name !== 'playerGlow') {
      if (child.name === 'hand' && highlightPart === 'hand') {
        child.material = newMaterials.glow;
      } else if (child.name === 'foot' && highlightPart === 'foot') {
        child.material = newMaterials.glow;
      } else if (child.parent?.name === 'head' && highlightPart === 'head') {
        child.material = newMaterials.glow;
      } else {
        child.material = newMaterials.body;
      }
    }
  });
  
  // Handle player glow
  const existingGlow = playerGroup.getObjectByName('playerGlow');
  if (highlighted && !existingGlow) {
    addPlayerGlow(playerGroup, color);
  } else if (!highlighted && existingGlow) {
    playerGroup.remove(existingGlow);
    existingGlow.geometry.dispose();
    existingGlow.material.dispose();
  }
  
  playerGroup.userData.highlighted = highlighted;
  playerGroup.userData.highlightPart = highlightPart;
}

// ============================================
// EXPORTS
// ============================================

window.PlayerFigures = {
  create: createPlayerFigure,
  updateHighlight: updatePlayerHighlight,
  createBall: createBall,
  CONFIG: PLAYER_CONFIG
};
