/**
 * Field Game 3D - Player Figures v5
 * FIXED: 5x larger, connected body parts, smooth appearance
 */

// Player dimensions - SCALED UP 5x (was ~1.8m, now display at ~9m for visibility)
const SCALE = 5.0;

const PLAYER_CONFIG = {
  height: 1.8 * SCALE,
  headRadius: 0.12 * SCALE,
  neckRadius: 0.06 * SCALE,
  neckLength: 0.1 * SCALE,
  
  torsoLength: 0.55 * SCALE,
  chestRadius: 0.18 * SCALE,
  waistRadius: 0.14 * SCALE,
  
  shoulderWidth: 0.42 * SCALE,
  
  upperArmLength: 0.28 * SCALE,
  upperArmRadius: 0.05 * SCALE,
  lowerArmLength: 0.26 * SCALE,
  lowerArmRadius: 0.04 * SCALE,
  handRadius: 0.05 * SCALE,
  
  hipWidth: 0.24 * SCALE,
  upperLegLength: 0.42 * SCALE,
  upperLegRadius: 0.08 * SCALE,
  lowerLegLength: 0.40 * SCALE,
  lowerLegRadius: 0.055 * SCALE,
  footLength: 0.24 * SCALE,
  footRadius: 0.045 * SCALE,
};

const SEGMENTS = 24;

// ============================================
// MATERIALS
// ============================================

function createMaterials(color, highlighted) {
  const baseColor = new THREE.Color(color);
  
  return {
    wireframe: new THREE.MeshBasicMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: highlighted ? 0.95 : 0.85,
    }),
    inner: new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: highlighted ? 0.2 : 0.1,
    }),
    highlight: new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      wireframe: true,
      transparent: true,
      opacity: 1.0,
    }),
    highlightInner: new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.3,
    }),
    color: color,
    highlighted: highlighted
  };
}

// ============================================
// GEOMETRY HELPERS - CONNECTED PARTS
// ============================================

function createSphere(radius, mat) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(radius, SEGMENTS, SEGMENTS / 2);
  group.add(new THREE.Mesh(geo, mat.wireframe));
  group.add(new THREE.Mesh(geo.clone(), mat.inner));
  return group;
}

function createCylinder(radiusTop, radiusBot, length, mat) {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBot, length, SEGMENTS);
  group.add(new THREE.Mesh(geo, mat.wireframe));
  group.add(new THREE.Mesh(geo.clone(), mat.inner));
  return group;
}

// Creates a limb segment with spheres at joints for smooth connection
function createLimb(length, radiusTop, radiusBot, mat) {
  const group = new THREE.Group();
  
  // Main cylinder
  const cyl = createCylinder(radiusTop, radiusBot, length, mat);
  group.add(cyl);
  
  // Top joint sphere
  const topJoint = createSphere(radiusTop, mat);
  topJoint.position.y = length / 2;
  group.add(topJoint);
  
  // Bottom joint sphere  
  const botJoint = createSphere(radiusBot, mat);
  botJoint.position.y = -length / 2;
  group.add(botJoint);
  
  return group;
}

// ============================================
// BODY CONSTRUCTION
// ============================================

function createHead(mat, isHighlight) {
  const P = PLAYER_CONFIG;
  const m = isHighlight ? { wireframe: mat.highlight, inner: mat.highlightInner } : mat;
  const group = new THREE.Group();
  
  // Head sphere
  const head = createSphere(P.headRadius, m);
  group.add(head);
  
  // Neck connecting to torso
  const neck = createCylinder(P.neckRadius, P.neckRadius * 1.1, P.neckLength, mat);
  neck.position.y = -P.headRadius - P.neckLength / 2;
  group.add(neck);
  
  return group;
}

function createTorso(mat) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  
  // Main torso - tapered cylinder
  const torso = createCylinder(P.chestRadius, P.waistRadius, P.torsoLength, mat);
  group.add(torso);
  
  // Chest sphere at top
  const chest = createSphere(P.chestRadius, mat);
  chest.position.y = P.torsoLength / 2;
  group.add(chest);
  
  // Hip sphere at bottom
  const hip = createSphere(P.waistRadius * 1.1, mat);
  hip.position.y = -P.torsoLength / 2;
  group.add(hip);
  
  return group;
}

function createArm(mat, isHighlightHand) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  
  // Shoulder
  const shoulder = createSphere(P.upperArmRadius * 1.2, mat);
  group.add(shoulder);
  
  // Upper arm
  const upperArm = createLimb(P.upperArmLength, P.upperArmRadius, P.upperArmRadius * 0.9, mat);
  upperArm.position.y = -P.upperArmLength / 2;
  group.add(upperArm);
  
  // Lower arm
  const lowerArm = createLimb(P.lowerArmLength, P.lowerArmRadius, P.lowerArmRadius * 0.8, mat);
  lowerArm.position.y = -P.upperArmLength - P.lowerArmLength / 2;
  group.add(lowerArm);
  
  // Hand
  const handMat = isHighlightHand ? { wireframe: mat.highlight, inner: mat.highlightInner } : mat;
  const hand = createSphere(P.handRadius, handMat);
  hand.position.y = -P.upperArmLength - P.lowerArmLength - P.handRadius;
  hand.name = 'hand';
  group.add(hand);
  
  return group;
}

function createLeg(mat, isHighlightFoot) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  
  // Hip joint
  const hipJoint = createSphere(P.upperLegRadius * 1.1, mat);
  group.add(hipJoint);
  
  // Upper leg
  const upperLeg = createLimb(P.upperLegLength, P.upperLegRadius, P.upperLegRadius * 0.85, mat);
  upperLeg.position.y = -P.upperLegLength / 2;
  group.add(upperLeg);
  
  // Lower leg
  const lowerLeg = createLimb(P.lowerLegLength, P.lowerLegRadius, P.lowerLegRadius * 0.7, mat);
  lowerLeg.position.y = -P.upperLegLength - P.lowerLegLength / 2;
  group.add(lowerLeg);
  
  // Foot
  const footMat = isHighlightFoot ? { wireframe: mat.highlight, inner: mat.highlightInner } : mat;
  const foot = createSphere(P.footRadius, footMat);
  foot.position.y = -P.upperLegLength - P.lowerLegLength - P.footRadius;
  foot.scale.set(1, 0.6, 1.8); // Flatten and elongate
  foot.name = 'foot';
  group.add(foot);
  
  return group;
}

// ============================================
// POSES
// ============================================

function buildStandingPose(group, mat, highlightPart) {
  const P = PLAYER_CONFIG;
  
  // Calculate heights
  const legHeight = P.upperLegLength + P.lowerLegLength + P.footRadius * 0.6;
  const torsoY = legHeight + P.torsoLength / 2;
  const headY = legHeight + P.torsoLength + P.neckLength + P.headRadius;
  const shoulderY = torsoY + P.torsoLength * 0.4;
  const hipY = legHeight;
  
  // Torso
  const torso = createTorso(mat);
  torso.position.y = torsoY;
  group.add(torso);
  
  // Head
  const head = createHead(mat, highlightPart === 'head');
  head.position.y = headY;
  group.add(head);
  
  // Arms
  const leftArm = createArm(mat, highlightPart === 'hand');
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, 0);
  leftArm.rotation.z = -0.1;
  group.add(leftArm);
  
  const rightArm = createArm(mat, highlightPart === 'hand');
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, 0);
  rightArm.rotation.z = 0.1;
  group.add(rightArm);
  
  // Legs
  const leftLeg = createLeg(mat, highlightPart === 'foot');
  leftLeg.position.set(P.hipWidth / 2, hipY, 0);
  group.add(leftLeg);
  
  const rightLeg = createLeg(mat, highlightPart === 'foot');
  rightLeg.position.set(-P.hipWidth / 2, hipY, 0);
  group.add(rightLeg);
}

function buildRunningPose(group, mat, hasBall, highlightPart) {
  const P = PLAYER_CONFIG;
  
  const legHeight = P.upperLegLength + P.lowerLegLength + P.footRadius * 0.6;
  const torsoY = legHeight + P.torsoLength / 2;
  const headY = legHeight + P.torsoLength + P.neckLength + P.headRadius;
  const shoulderY = torsoY + P.torsoLength * 0.4;
  const hipY = legHeight;
  
  // Torso - leaning forward
  const torso = createTorso(mat);
  torso.position.y = torsoY;
  torso.position.z = -P.torsoLength * 0.1;
  torso.rotation.x = 0.15;
  group.add(torso);
  
  // Head
  const head = createHead(mat, highlightPart === 'head');
  head.position.y = headY;
  head.position.z = -P.torsoLength * 0.15;
  group.add(head);
  
  // Arms - running motion
  const leftArm = createArm(mat, highlightPart === 'hand');
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, -P.torsoLength * 0.1);
  leftArm.rotation.x = 0.5;
  leftArm.rotation.z = -0.15;
  group.add(leftArm);
  
  const rightArm = createArm(mat, highlightPart === 'hand');
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, -P.torsoLength * 0.1);
  rightArm.rotation.x = -0.6;
  rightArm.rotation.z = 0.15;
  group.add(rightArm);
  
  // Legs - stride
  const leftLeg = createLeg(mat, highlightPart === 'foot');
  leftLeg.position.set(P.hipWidth / 2, hipY, 0);
  leftLeg.rotation.x = -0.35;
  group.add(leftLeg);
  
  const rightLeg = createLeg(mat, highlightPart === 'foot');
  rightLeg.position.set(-P.hipWidth / 2, hipY, 0);
  rightLeg.rotation.x = 0.4;
  group.add(rightLeg);
  
  // Ball at feet if has ball
  if (hasBall) {
    const ball = createBall();
    ball.position.set(0.3 * SCALE, 0.12 * SCALE, -0.5 * SCALE);
    group.add(ball);
  }
}

function buildBullyCrouchPose(group, mat, highlightPart) {
  const P = PLAYER_CONFIG;
  
  // Crouched position - much lower
  const crouchHeight = P.height * 0.4;
  const torsoY = crouchHeight;
  const headY = crouchHeight + P.torsoLength * 0.3;
  
  // Torso - heavily bent forward
  const torso = createTorso(mat);
  torso.position.y = torsoY;
  torso.position.z = -P.torsoLength * 0.4;
  torso.rotation.x = 1.2; // Almost horizontal
  group.add(torso);
  
  // Head - tucked
  const head = createHead(mat, highlightPart === 'head');
  head.position.y = headY;
  head.position.z = -P.torsoLength * 0.9;
  head.rotation.x = 0.3;
  group.add(head);
  
  // Arms - out to sides, binding
  const leftArm = createArm(mat, highlightPart === 'hand');
  leftArm.position.set(P.shoulderWidth / 2 + P.upperArmLength * 0.3, torsoY + P.torsoLength * 0.2, -P.torsoLength * 0.3);
  leftArm.rotation.z = -1.3;
  leftArm.rotation.x = 0.4;
  group.add(leftArm);
  
  const rightArm = createArm(mat, highlightPart === 'hand');
  rightArm.position.set(-P.shoulderWidth / 2 - P.upperArmLength * 0.3, torsoY + P.torsoLength * 0.2, -P.torsoLength * 0.3);
  rightArm.rotation.z = 1.3;
  rightArm.rotation.x = 0.4;
  group.add(rightArm);
  
  // Legs - crouched, feet planted
  const leftLeg = createLeg(mat, highlightPart === 'foot');
  leftLeg.position.set(P.hipWidth / 2, torsoY - P.torsoLength * 0.3, 0);
  leftLeg.rotation.x = 0.8;
  group.add(leftLeg);
  
  const rightLeg = createLeg(mat, highlightPart === 'foot');
  rightLeg.position.set(-P.hipWidth / 2, torsoY - P.torsoLength * 0.3, 0);
  rightLeg.rotation.x = 0.8;
  group.add(rightLeg);
}

function buildBullyStandPose(group, mat, highlightPart) {
  const P = PLAYER_CONFIG;
  
  const legHeight = P.upperLegLength + P.lowerLegLength + P.footRadius * 0.6;
  const torsoY = legHeight + P.torsoLength / 2;
  const headY = legHeight + P.torsoLength + P.neckLength + P.headRadius;
  const shoulderY = torsoY + P.torsoLength * 0.4;
  const hipY = legHeight;
  
  // Torso - slight lean
  const torso = createTorso(mat);
  torso.position.y = torsoY;
  torso.rotation.x = 0.1;
  group.add(torso);
  
  // Head
  const head = createHead(mat, highlightPart === 'head');
  head.position.y = headY;
  group.add(head);
  
  // Arms - out to sides for binding
  const leftArm = createArm(mat, highlightPart === 'hand');
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, 0);
  leftArm.rotation.z = -1.0;
  leftArm.rotation.x = 0.2;
  group.add(leftArm);
  
  const rightArm = createArm(mat, highlightPart === 'hand');
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, 0);
  rightArm.rotation.z = 1.0;
  rightArm.rotation.x = 0.2;
  group.add(rightArm);
  
  // Legs - wide stance
  const leftLeg = createLeg(mat, highlightPart === 'foot');
  leftLeg.position.set(P.hipWidth / 2 + 0.1 * SCALE, hipY, 0);
  leftLeg.rotation.z = -0.1;
  group.add(leftLeg);
  
  const rightLeg = createLeg(mat, highlightPart === 'foot');
  rightLeg.position.set(-P.hipWidth / 2 - 0.1 * SCALE, hipY, 0);
  rightLeg.rotation.z = 0.1;
  group.add(rightLeg);
}

// ============================================
// MAIN FACTORY
// ============================================

function createPlayerFigure(pose = 'run_noBall', color = 0x2980b9, highlighted = false, highlightPart = null) {
  const group = new THREE.Group();
  group.name = 'player';
  group.userData = { pose, color, highlighted, highlightPart };
  
  const mat = createMaterials(color, highlighted);
  
  switch (pose) {
    case 'run_ball':
      buildRunningPose(group, mat, true, highlightPart);
      break;
    case 'run_noBall':
      buildRunningPose(group, mat, false, highlightPart);
      break;
    case 'bully_crouch':
      buildBullyCrouchPose(group, mat, highlightPart);
      break;
    case 'bully_stand':
      buildBullyStandPose(group, mat, highlightPart);
      break;
    default:
      buildStandingPose(group, mat, highlightPart);
  }
  
  if (highlighted) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(P.height * 0.4, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.08, side: THREE.BackSide })
    );
    glow.position.y = P.height * 0.5;
    glow.scale.set(1, 1.5, 1);
    group.add(glow);
  }
  
  return group;
}

// ============================================
// BALL
// ============================================

function createBall() {
  const group = new THREE.Group();
  const radius = 0.11 * SCALE;
  
  const geo = new THREE.SphereGeometry(radius, 20, 14);
  
  group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    wireframe: true,
    transparent: true,
    opacity: 0.9
  })));
  
  group.add(new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.25
  })));
  
  group.name = 'football';
  return group;
}

// ============================================
// UPDATE HIGHLIGHT
// ============================================

function updatePlayerHighlight(playerGroup, highlighted, highlightPart = null) {
  const { pose, color } = playerGroup.userData;
  const pos = playerGroup.position.clone();
  const rot = playerGroup.rotation.clone();
  
  // Clear
  while (playerGroup.children.length > 0) {
    const child = playerGroup.children[0];
    playerGroup.remove(child);
  }
  
  // Rebuild
  const mat = createMaterials(color, highlighted);
  
  switch (pose) {
    case 'run_ball':
      buildRunningPose(playerGroup, mat, true, highlightPart);
      break;
    case 'run_noBall':
      buildRunningPose(playerGroup, mat, false, highlightPart);
      break;
    case 'bully_crouch':
      buildBullyCrouchPose(playerGroup, mat, highlightPart);
      break;
    case 'bully_stand':
      buildBullyStandPose(playerGroup, mat, highlightPart);
      break;
    default:
      buildStandingPose(playerGroup, mat, highlightPart);
  }
  
  playerGroup.position.copy(pos);
  playerGroup.rotation.copy(rot);
  playerGroup.userData.highlighted = highlighted;
  playerGroup.userData.highlightPart = highlightPart;
}

// ============================================
// EXPORTS
// ============================================

const P = PLAYER_CONFIG;

window.PlayerFigures = {
  create: createPlayerFigure,
  updateHighlight: updatePlayerHighlight,
  createBall: createBall,
  CONFIG: PLAYER_CONFIG,
  SCALE: SCALE
};
