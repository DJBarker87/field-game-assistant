/**
 * Field Game 3D - Player Figures v4
 * Glowing wireframe holographic style
 * Clean, high-quality appearance
 * Adult proportions (1.8m tall)
 */

// Player dimensions (in meters, adult male proportions)
const PLAYER_CONFIG = {
  height: 1.8,
  headRadius: 0.105,
  neckRadius: 0.05,
  neckLength: 0.08,
  torsoHeight: 0.52,
  chestWidth: 0.38,
  chestDepth: 0.22,
  waistWidth: 0.30,
  shoulderWidth: 0.44,
  upperArmLength: 0.29,
  upperArmRadius: 0.04,
  lowerArmLength: 0.27,
  lowerArmRadius: 0.035,
  handLength: 0.09,
  handWidth: 0.045,
  hipWidth: 0.26,
  upperLegLength: 0.44,
  upperLegRadius: 0.065,
  lowerLegLength: 0.40,
  lowerLegRadius: 0.045,
  footLength: 0.25,
  footWidth: 0.09,
  footHeight: 0.07,
};

// High-quality segment counts
const SEGMENTS = {
  sphere: 32,
  cylinder: 24,
  detail: 16
};

// ============================================
// WIREFRAME MATERIALS
// ============================================

function createWireframeMaterials(color, highlighted, highlightPart) {
  const baseColor = new THREE.Color(color);
  const glowColor = highlighted ? new THREE.Color(0xf1c40f) : baseColor;
  
  // Main wireframe material
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: baseColor,
    wireframe: true,
    transparent: true,
    opacity: highlighted ? 0.95 : 0.8,
  });
  
  // Inner glow material (slightly transparent solid)
  const innerGlowMaterial = new THREE.MeshBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: highlighted ? 0.25 : 0.12,
    side: THREE.DoubleSide,
  });
  
  // Highlight glow for specific parts
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    wireframe: true,
    transparent: true,
    opacity: 1.0,
  });
  
  const highlightInnerMaterial = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  
  // Edge glow (for that bright outline effect)
  const edgeGlowMaterial = new THREE.LineBasicMaterial({
    color: highlighted ? 0xffffff : baseColor.clone().multiplyScalar(1.5),
    transparent: true,
    opacity: 0.6,
    linewidth: 2,
  });
  
  return {
    wireframe: wireframeMaterial,
    inner: innerGlowMaterial,
    highlight: highlightMaterial,
    highlightInner: highlightInnerMaterial,
    edge: edgeGlowMaterial,
    color: color,
    highlighted: highlighted,
    highlightPart: highlightPart
  };
}

// ============================================
// MAIN FACTORY
// ============================================

function createPlayerFigure(pose = 'run_noBall', color = 0x2980b9, highlighted = false, highlightPart = null) {
  const group = new THREE.Group();
  group.name = 'player';
  group.userData = { pose, color, highlighted, highlightPart };
  
  const materials = createWireframeMaterials(color, highlighted, highlightPart);
  
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
  
  // Add overall glow effect for highlighted players
  if (highlighted) {
    addPlayerGlow(group);
  }
  
  return group;
}

function addPlayerGlow(group) {
  // Subtle outer glow
  const glowGeo = new THREE.SphereGeometry(0.6, 16, 12);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 0.9;
  glow.scale.set(1.2, 2.2, 1.2);
  glow.name = 'playerGlow';
  group.add(glow);
}

// ============================================
// WIREFRAME BODY PART CREATORS
// ============================================

function createWireframeSphere(radius, materials, isHighlightPart = false) {
  const group = new THREE.Group();
  
  const geo = new THREE.SphereGeometry(radius, SEGMENTS.sphere, SEGMENTS.sphere / 2);
  
  // Wireframe mesh
  const wireMat = isHighlightPart ? materials.highlight : materials.wireframe;
  const wire = new THREE.Mesh(geo, wireMat);
  group.add(wire);
  
  // Inner glow
  const innerMat = isHighlightPart ? materials.highlightInner : materials.inner;
  const inner = new THREE.Mesh(geo.clone(), innerMat);
  inner.scale.setScalar(0.98);
  group.add(inner);
  
  return group;
}

function createWireframeCapsule(radius, length, materials, isHighlightPart = false) {
  const group = new THREE.Group();
  
  const wireMat = isHighlightPart ? materials.highlight : materials.wireframe;
  const innerMat = isHighlightPart ? materials.highlightInner : materials.inner;
  
  // Cylinder body
  const cylGeo = new THREE.CylinderGeometry(radius, radius, length, SEGMENTS.cylinder, 1, true);
  const cylWire = new THREE.Mesh(cylGeo, wireMat);
  group.add(cylWire);
  
  const cylInner = new THREE.Mesh(cylGeo.clone(), innerMat);
  cylInner.scale.setScalar(0.98);
  group.add(cylInner);
  
  // Top cap
  const topGeo = new THREE.SphereGeometry(radius, SEGMENTS.detail, SEGMENTS.detail / 2, 0, Math.PI * 2, 0, Math.PI / 2);
  const topWire = new THREE.Mesh(topGeo, wireMat);
  topWire.position.y = length / 2;
  group.add(topWire);
  
  const topInner = new THREE.Mesh(topGeo.clone(), innerMat);
  topInner.position.y = length / 2;
  topInner.scale.setScalar(0.98);
  group.add(topInner);
  
  // Bottom cap
  const botGeo = new THREE.SphereGeometry(radius, SEGMENTS.detail, SEGMENTS.detail / 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const botWire = new THREE.Mesh(botGeo, wireMat);
  botWire.position.y = -length / 2;
  group.add(botWire);
  
  const botInner = new THREE.Mesh(botGeo.clone(), innerMat);
  botInner.position.y = -length / 2;
  botInner.scale.setScalar(0.98);
  group.add(botInner);
  
  return group;
}

function createWireframeTaperedCapsule(radiusTop, radiusBottom, length, materials, isHighlightPart = false) {
  const group = new THREE.Group();
  
  const wireMat = isHighlightPart ? materials.highlight : materials.wireframe;
  const innerMat = isHighlightPart ? materials.highlightInner : materials.inner;
  
  // Tapered cylinder
  const cylGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, SEGMENTS.cylinder, 1, true);
  const cylWire = new THREE.Mesh(cylGeo, wireMat);
  group.add(cylWire);
  
  const cylInner = new THREE.Mesh(cylGeo.clone(), innerMat);
  cylInner.scale.set(0.98, 1, 0.98);
  group.add(cylInner);
  
  // Top cap
  const topGeo = new THREE.SphereGeometry(radiusTop, SEGMENTS.detail, SEGMENTS.detail / 2, 0, Math.PI * 2, 0, Math.PI / 2);
  const topWire = new THREE.Mesh(topGeo, wireMat);
  topWire.position.y = length / 2;
  group.add(topWire);
  
  // Bottom cap
  const botGeo = new THREE.SphereGeometry(radiusBottom, SEGMENTS.detail, SEGMENTS.detail / 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const botWire = new THREE.Mesh(botGeo, wireMat);
  botWire.position.y = -length / 2;
  group.add(botWire);
  
  return group;
}

function createWireframeEllipsoid(rx, ry, rz, materials, isHighlightPart = false) {
  const group = new THREE.Group();
  
  const geo = new THREE.SphereGeometry(1, SEGMENTS.sphere, SEGMENTS.sphere / 2);
  
  const wireMat = isHighlightPart ? materials.highlight : materials.wireframe;
  const wire = new THREE.Mesh(geo, wireMat);
  wire.scale.set(rx, ry, rz);
  group.add(wire);
  
  const innerMat = isHighlightPart ? materials.highlightInner : materials.inner;
  const inner = new THREE.Mesh(geo.clone(), innerMat);
  inner.scale.set(rx * 0.96, ry * 0.96, rz * 0.96);
  group.add(inner);
  
  return group;
}

// ============================================
// BODY PARTS
// ============================================

function createHead(materials) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  group.name = 'head';
  
  const isHighlight = materials.highlightPart === 'head';
  
  // Head - slightly elongated
  const head = createWireframeSphere(P.headRadius, materials, isHighlight);
  head.scale.set(1, 1.08, 0.95);
  group.add(head);
  
  // Neck
  const neck = createWireframeCapsule(P.neckRadius, P.neckLength, materials, false);
  neck.position.y = -P.headRadius - P.neckLength / 2;
  group.add(neck);
  
  // Glow point at joints (like in reference)
  if (isHighlight) {
    addJointGlow(group, 0, 0, 0, 0.15);
  }
  
  return group;
}

function createTorso(materials) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  group.name = 'torso';
  
  // Chest - upper torso ellipsoid
  const chest = createWireframeEllipsoid(P.chestWidth / 2, P.torsoHeight * 0.32, P.chestDepth / 2, materials, false);
  chest.position.y = P.torsoHeight * 0.18;
  group.add(chest);
  
  // Waist - lower torso, narrower
  const waist = createWireframeEllipsoid(P.waistWidth / 2, P.torsoHeight * 0.28, P.chestDepth / 2.2, materials, false);
  waist.position.y = -P.torsoHeight * 0.15;
  group.add(waist);
  
  // Core connection
  const coreGeo = new THREE.CylinderGeometry(P.waistWidth / 2.5, P.chestWidth / 2.5, P.torsoHeight * 0.22, SEGMENTS.cylinder);
  const coreWire = new THREE.Mesh(coreGeo, materials.wireframe);
  group.add(coreWire);
  
  const coreInner = new THREE.Mesh(coreGeo.clone(), materials.inner);
  coreInner.scale.setScalar(0.95);
  group.add(coreInner);
  
  return group;
}

function createArm(materials, side) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  group.name = side + '_arm';
  
  const isHighlightHand = materials.highlightPart === 'hand';
  
  // Shoulder joint
  const shoulder = createWireframeSphere(P.upperArmRadius * 1.2, materials, false);
  group.add(shoulder);
  addJointGlow(group, 0, 0, 0, 0.04);
  
  // Upper arm
  const upperArm = createWireframeTaperedCapsule(P.upperArmRadius * 1.05, P.upperArmRadius * 0.9, P.upperArmLength, materials, false);
  upperArm.position.y = -P.upperArmLength / 2 - P.upperArmRadius;
  group.add(upperArm);
  
  // Elbow joint
  const elbow = createWireframeSphere(P.upperArmRadius, materials, false);
  elbow.position.y = -P.upperArmLength - P.upperArmRadius;
  group.add(elbow);
  addJointGlow(group, 0, -P.upperArmLength - P.upperArmRadius, 0, 0.035);
  
  // Lower arm
  const lowerArm = createWireframeTaperedCapsule(P.lowerArmRadius * 1.0, P.lowerArmRadius * 0.8, P.lowerArmLength, materials, false);
  lowerArm.position.y = -P.upperArmLength - P.upperArmRadius - P.lowerArmLength / 2;
  group.add(lowerArm);
  
  // Wrist
  const wrist = createWireframeSphere(P.lowerArmRadius * 0.85, materials, isHighlightHand);
  wrist.position.y = -P.upperArmLength - P.upperArmRadius - P.lowerArmLength;
  group.add(wrist);
  
  // Hand
  const hand = createWireframeEllipsoid(P.handWidth, P.handLength * 0.4, P.handWidth * 0.6, materials, isHighlightHand);
  hand.position.y = -P.upperArmLength - P.upperArmRadius - P.lowerArmLength - P.handLength * 0.35;
  hand.name = 'hand';
  group.add(hand);
  
  if (isHighlightHand) {
    addJointGlow(group, 0, hand.position.y, 0, 0.08);
  }
  
  return group;
}

function createLeg(materials, side) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  group.name = side + '_leg';
  
  const isHighlightFoot = materials.highlightPart === 'foot';
  
  // Hip joint
  const hip = createWireframeSphere(P.upperLegRadius * 1.1, materials, false);
  group.add(hip);
  addJointGlow(group, 0, 0, 0, 0.05);
  
  // Thigh
  const thigh = createWireframeTaperedCapsule(P.upperLegRadius * 1.1, P.upperLegRadius * 0.85, P.upperLegLength, materials, false);
  thigh.position.y = -P.upperLegLength / 2 - P.upperLegRadius * 0.4;
  group.add(thigh);
  
  // Knee joint
  const knee = createWireframeSphere(P.upperLegRadius * 0.9, materials, false);
  knee.position.y = -P.upperLegLength - P.upperLegRadius * 0.4;
  group.add(knee);
  addJointGlow(group, 0, -P.upperLegLength - P.upperLegRadius * 0.4, 0, 0.045);
  
  // Shin
  const shin = createWireframeTaperedCapsule(P.lowerLegRadius * 1.05, P.lowerLegRadius * 0.7, P.lowerLegLength, materials, false);
  shin.position.y = -P.upperLegLength - P.upperLegRadius * 0.4 - P.lowerLegLength / 2;
  group.add(shin);
  
  // Ankle
  const ankle = createWireframeSphere(P.lowerLegRadius * 0.75, materials, isHighlightFoot);
  ankle.position.y = -P.upperLegLength - P.upperLegRadius * 0.4 - P.lowerLegLength;
  group.add(ankle);
  
  // Foot
  const foot = createWireframeEllipsoid(P.footWidth / 2, P.footHeight / 2, P.footLength / 2, materials, isHighlightFoot);
  foot.position.y = -P.upperLegLength - P.upperLegRadius * 0.4 - P.lowerLegLength - P.footHeight / 2 + 0.01;
  foot.position.z = -P.footLength * 0.12;
  foot.name = 'foot';
  group.add(foot);
  
  if (isHighlightFoot) {
    addJointGlow(group, 0, foot.position.y, foot.position.z, 0.06);
  }
  
  return group;
}

// Joint glow effect (bright points at joints like in reference)
function addJointGlow(group, x, y, z, size) {
  const glowGeo = new THREE.SphereGeometry(size, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(x, y, z);
  glow.name = 'jointGlow';
  group.add(glow);
}

// ============================================
// POSES
// ============================================

function buildRunningPose(group, materials, hasBall) {
  const P = PLAYER_CONFIG;
  const legLength = P.upperLegLength + P.lowerLegLength + P.footHeight;
  const torsoY = legLength + P.torsoHeight / 2;
  const headY = torsoY + P.torsoHeight / 2 + P.neckLength + P.headRadius;
  
  const torsoLean = 0.12;
  
  // Torso
  const torso = createTorso(materials);
  torso.rotation.x = torsoLean;
  torso.position.y = torsoY;
  torso.position.z = -Math.sin(torsoLean) * P.torsoHeight * 0.25;
  group.add(torso);
  
  // Head
  const head = createHead(materials);
  head.position.y = headY;
  head.position.z = -Math.sin(torsoLean) * P.torsoHeight * 0.35;
  group.add(head);
  
  // Arms - running motion
  const shoulderY = torsoY + P.torsoHeight * 0.32;
  
  const rightArm = createArm(materials, 'right');
  rightArm.rotation.x = -0.75;
  rightArm.rotation.z = 0.1;
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, -Math.sin(torsoLean) * P.torsoHeight * 0.15);
  group.add(rightArm);
  
  const leftArm = createArm(materials, 'left');
  leftArm.rotation.x = 0.55;
  leftArm.rotation.z = -0.1;
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, -Math.sin(torsoLean) * P.torsoHeight * 0.15);
  group.add(leftArm);
  
  // Legs - running stride
  const hipY = torsoY - P.torsoHeight / 2;
  
  const rightLeg = createLeg(materials, 'right');
  rightLeg.rotation.x = 0.45;
  rightLeg.position.set(-P.hipWidth / 2, hipY, 0);
  group.add(rightLeg);
  
  const leftLeg = createLeg(materials, 'left');
  leftLeg.rotation.x = -0.35;
  leftLeg.position.set(P.hipWidth / 2, hipY, 0);
  group.add(leftLeg);
  
  if (hasBall) {
    const ball = createBall();
    ball.position.set(0.12, 0.11, -0.45);
    group.add(ball);
  }
}

function buildBullyCrouchPose(group, materials) {
  const P = PLAYER_CONFIG;
  
  const bodyAngle = Math.PI * 0.38;
  const torsoHeight = 0.72;
  const headHeight = 0.55;
  
  // Torso - nearly horizontal
  const torso = createTorso(materials);
  torso.rotation.x = bodyAngle;
  torso.position.y = torsoHeight;
  torso.position.z = -0.18;
  group.add(torso);
  
  // Head - tucked low
  const head = createHead(materials);
  head.position.y = headHeight;
  head.position.z = -0.48;
  head.rotation.x = 0.2;
  group.add(head);
  
  // Arms - binding
  const shoulderY = torsoHeight + 0.1;
  
  const rightArm = createBindingArm(materials, 'right');
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, -0.08);
  group.add(rightArm);
  
  const leftArm = createBindingArm(materials, 'left');
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, -0.08);
  group.add(leftArm);
  
  // Legs - crouched
  const hipY = torsoHeight - 0.12;
  
  const rightLeg = createCrouchedLeg(materials, 'right');
  rightLeg.position.set(-P.hipWidth / 2, hipY, 0.08);
  group.add(rightLeg);
  
  const leftLeg = createCrouchedLeg(materials, 'left');
  leftLeg.position.set(P.hipWidth / 2, hipY, 0.08);
  group.add(leftLeg);
}

function buildBullyStandPose(group, materials) {
  const P = PLAYER_CONFIG;
  
  const legLength = P.upperLegLength + P.lowerLegLength + P.footHeight;
  const torsoY = legLength + P.torsoHeight / 2;
  const headY = torsoY + P.torsoHeight / 2 + P.neckLength + P.headRadius;
  
  // Torso - slight forward lean
  const torso = createTorso(materials);
  torso.rotation.x = 0.1;
  torso.position.y = torsoY;
  group.add(torso);
  
  // Head
  const head = createHead(materials);
  head.position.y = headY;
  head.position.z = -0.04;
  group.add(head);
  
  // Arms - binding (standing)
  const shoulderY = torsoY + P.torsoHeight * 0.28;
  
  const rightArm = createBindingArmStanding(materials, 'right');
  rightArm.position.set(-P.shoulderWidth / 2, shoulderY, 0);
  group.add(rightArm);
  
  const leftArm = createBindingArmStanding(materials, 'left');
  leftArm.position.set(P.shoulderWidth / 2, shoulderY, 0);
  group.add(leftArm);
  
  // Legs - apart
  const hipY = torsoY - P.torsoHeight / 2;
  
  const rightLeg = createLeg(materials, 'right');
  rightLeg.rotation.z = 0.08;
  rightLeg.position.set(-P.hipWidth / 2 - 0.04, hipY, 0);
  group.add(rightLeg);
  
  const leftLeg = createLeg(materials, 'left');
  leftLeg.rotation.z = -0.08;
  leftLeg.position.set(P.hipWidth / 2 + 0.04, hipY, 0);
  group.add(leftLeg);
}

// ============================================
// BINDING ARMS
// ============================================

function createBindingArm(materials, side) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  group.name = side + '_arm_binding';
  
  const isRight = side === 'right';
  const sideSign = isRight ? -1 : 1;
  const isHighlightHand = materials.highlightPart === 'hand';
  
  // Shoulder
  const shoulder = createWireframeSphere(P.upperArmRadius * 1.2, materials, false);
  group.add(shoulder);
  addJointGlow(group, 0, 0, 0, 0.04);
  
  // Upper arm - out to side
  const upperArm = createWireframeCapsule(P.upperArmRadius, P.upperArmLength, materials, false);
  upperArm.rotation.z = sideSign * 1.15;
  upperArm.rotation.x = 0.25;
  upperArm.position.set(sideSign * P.upperArmLength * 0.38, -0.02, 0.06);
  group.add(upperArm);
  
  // Elbow
  const elbowX = sideSign * P.upperArmLength * 0.78;
  const elbow = createWireframeSphere(P.upperArmRadius * 0.95, materials, false);
  elbow.position.set(elbowX, -0.05, 0.1);
  group.add(elbow);
  addJointGlow(group, elbowX, -0.05, 0.1, 0.03);
  
  // Lower arm - wrapping
  const lowerArm = createWireframeCapsule(P.lowerArmRadius, P.lowerArmLength, materials, false);
  lowerArm.rotation.z = sideSign * 0.35;
  lowerArm.rotation.x = 0.65;
  lowerArm.position.set(elbowX + sideSign * 0.06, -0.08, P.lowerArmLength * 0.45);
  group.add(lowerArm);
  
  // Hand
  const hand = createWireframeEllipsoid(P.handWidth, P.handLength * 0.38, P.handWidth * 0.55, materials, isHighlightHand);
  hand.position.set(elbowX + sideSign * 0.08, -0.1, P.lowerArmLength * 0.82);
  hand.name = 'hand';
  group.add(hand);
  
  if (isHighlightHand) {
    addJointGlow(group, hand.position.x, hand.position.y, hand.position.z, 0.06);
  }
  
  return group;
}

function createBindingArmStanding(materials, side) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  group.name = side + '_arm_binding_stand';
  
  const isRight = side === 'right';
  const sideSign = isRight ? -1 : 1;
  const isHighlightHand = materials.highlightPart === 'hand';
  
  // Shoulder
  const shoulder = createWireframeSphere(P.upperArmRadius * 1.2, materials, false);
  group.add(shoulder);
  addJointGlow(group, 0, 0, 0, 0.04);
  
  // Upper arm - out and down
  const upperArm = createWireframeCapsule(P.upperArmRadius, P.upperArmLength, materials, false);
  upperArm.rotation.z = sideSign * 0.95;
  upperArm.rotation.x = 0.12;
  upperArm.position.set(sideSign * P.upperArmLength * 0.32, -P.upperArmLength * 0.32, 0);
  group.add(upperArm);
  
  // Elbow
  const elbowX = sideSign * P.upperArmLength * 0.68;
  const elbowY = -P.upperArmLength * 0.58;
  const elbow = createWireframeSphere(P.upperArmRadius * 0.95, materials, false);
  elbow.position.set(elbowX, elbowY, 0.02);
  group.add(elbow);
  addJointGlow(group, elbowX, elbowY, 0.02, 0.03);
  
  // Lower arm - wrapping
  const lowerArm = createWireframeCapsule(P.lowerArmRadius, P.lowerArmLength, materials, false);
  lowerArm.rotation.z = sideSign * (-0.38);
  lowerArm.rotation.x = 0.4;
  lowerArm.position.set(elbowX + sideSign * 0.02, elbowY - 0.08, P.lowerArmLength * 0.32);
  group.add(lowerArm);
  
  // Hand
  const hand = createWireframeEllipsoid(P.handWidth, P.handLength * 0.38, P.handWidth * 0.55, materials, isHighlightHand);
  hand.position.set(elbowX - sideSign * 0.01, elbowY - 0.12, P.lowerArmLength * 0.58);
  hand.name = 'hand';
  group.add(hand);
  
  if (isHighlightHand) {
    addJointGlow(group, hand.position.x, hand.position.y, hand.position.z, 0.06);
  }
  
  return group;
}

function createCrouchedLeg(materials, side) {
  const P = PLAYER_CONFIG;
  const group = new THREE.Group();
  group.name = side + '_leg_crouch';
  
  // Hip
  const hip = createWireframeSphere(P.upperLegRadius * 1.05, materials, false);
  group.add(hip);
  addJointGlow(group, 0, 0, 0, 0.045);
  
  // Thigh - angled back
  const thigh = createWireframeTaperedCapsule(P.upperLegRadius * 1.08, P.upperLegRadius * 0.85, P.upperLegLength, materials, false);
  thigh.rotation.x = 0.75;
  thigh.position.y = -P.upperLegLength * 0.32;
  thigh.position.z = P.upperLegLength * 0.22;
  group.add(thigh);
  
  // Knee
  const kneeY = -P.upperLegLength * 0.52;
  const kneeZ = P.upperLegLength * 0.48;
  const knee = createWireframeSphere(P.upperLegRadius * 0.88, materials, false);
  knee.position.set(0, kneeY, kneeZ);
  group.add(knee);
  addJointGlow(group, 0, kneeY, kneeZ, 0.04);
  
  // Shin - bent forward
  const shinGroup = new THREE.Group();
  shinGroup.position.set(0, kneeY, kneeZ);
  shinGroup.rotation.x = -1.35;
  
  const shin = createWireframeTaperedCapsule(P.lowerLegRadius * 1.02, P.lowerLegRadius * 0.68, P.lowerLegLength, materials, false);
  shin.position.y = -P.lowerLegLength / 2;
  shinGroup.add(shin);
  
  // Foot
  const foot = createWireframeEllipsoid(P.footWidth / 2, P.footHeight / 2, P.footLength / 2, materials, false);
  foot.position.y = -P.lowerLegLength - P.footHeight / 2;
  foot.position.z = -P.footLength * 0.08;
  foot.rotation.x = 1.35;
  shinGroup.add(foot);
  
  group.add(shinGroup);
  
  return group;
}

// ============================================
// BALL
// ============================================

function createBall() {
  const group = new THREE.Group();
  group.name = 'football';
  
  // Wireframe ball
  const ballGeo = new THREE.SphereGeometry(0.11, 24, 16);
  const ballWire = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    wireframe: true,
    transparent: true,
    opacity: 0.9
  }));
  group.add(ballWire);
  
  // Inner glow
  const ballInner = new THREE.Mesh(ballGeo.clone(), new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.25
  }));
  ballInner.scale.setScalar(0.95);
  group.add(ballInner);
  
  // Bright glow
  const glowGeo = new THREE.SphereGeometry(0.14, 12, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.15
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);
  
  return group;
}

// ============================================
// UPDATE HIGHLIGHT
// ============================================

function updatePlayerHighlight(playerGroup, highlighted, highlightPart = null) {
  // For wireframe style, we need to rebuild the player with new materials
  // This is simpler than trying to update all the individual materials
  const { pose, color } = playerGroup.userData;
  
  // Store position and rotation
  const pos = playerGroup.position.clone();
  const rot = playerGroup.rotation.clone();
  
  // Clear existing children
  while (playerGroup.children.length > 0) {
    const child = playerGroup.children[0];
    playerGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
  
  // Rebuild with new materials
  const materials = createWireframeMaterials(color, highlighted, highlightPart);
  
  switch (pose) {
    case 'run_ball':
      buildRunningPose(playerGroup, materials, true);
      break;
    case 'run_noBall':
      buildRunningPose(playerGroup, materials, false);
      break;
    case 'bully_crouch':
      buildBullyCrouchPose(playerGroup, materials);
      break;
    case 'bully_stand':
      buildBullyStandPose(playerGroup, materials);
      break;
  }
  
  if (highlighted) {
    addPlayerGlow(playerGroup);
  }
  
  // Restore position and rotation
  playerGroup.position.copy(pos);
  playerGroup.rotation.copy(rot);
  
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
