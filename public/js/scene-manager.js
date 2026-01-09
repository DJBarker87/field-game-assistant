/**
 * Field Game 3D - Scenario Renderer
 * Part 3 + 5: Converts scenario data to 3D player positions
 * 
 * Handles:
 * - Coordinate conversion (2D scenario coords → 3D world coords)
 * - Player creation and positioning
 * - Pose inference based on scenario context
 * - Animation between steps
 * - PROPER BULLY FORMATION: Horizontal front row, correct spacing
 */

// ============================================
// COORDINATE SYSTEM
// ============================================
// 
// 2D Scenario coordinates:
//   - x: 0-110 (left goal to right goal)
//   - y: 0-75 (bottom touchline to top touchline)
//   - Origin: bottom-left corner
//
// 3D World coordinates:
//   - x: 0-110 (same as 2D x - along pitch length)
//   - y: 0+ (height above ground)
//   - z: 0-75 (same as 2D y - along pitch width)
//   - Origin: corner of pitch at ground level

// ============================================
// BULLY FORMATION CONSTANTS - SCALED FOR 5x PLAYER SIZE
// ============================================
const BULLY_CONFIG = {
  // Spacing between players in the front row (shoulder to shoulder, bound)
  playerSpacing: 4.0,         // 0.8m * 5 scale = 4m between player centers
  
  // Front row positions (6 players: 3 attackers, 3 defenders facing each other)
  frontRowOrder: ['c1', 'sp1', 'post', 'sp2', 'c2'],
  
  // Distance between attacking and defending front rows
  frontRowGap: 3.0,           // 0.6m * 5 scale = gap where heads interlock
  
  // Bup (back-up post) position behind the post
  bupOffsetX: 6.0,            // 1.2m * 5 scale
  
  // Engagement offset
  engagementOffset: 1.5       // 0.3m * 5 scale
};

/**
 * Converts 2D scenario position to 3D world position
 */
function scenarioTo3D(x, y) {
  return {
    x: x,       // Same axis
    y: 0,       // Ground level (will be adjusted by figure height)
    z: y        // 2D y becomes 3D z
  };
}

/**
 * Detects if we're in a bully formation and returns bully center position
 */
function detectBullyFormation(stepData) {
  // Check for bully zone
  const bullyZone = stepData.zones?.find(z => z.t === 'bully');
  if (!bullyZone) return null;
  
  // Find the center of the bully zone
  const centerX = bullyZone.x + bullyZone.w / 2;
  const centerZ = bullyZone.y + bullyZone.h / 2;
  
  // Count bully players
  const bullyRoles = ['post', 'sp1', 'sp2', 'c1', 'c2', 'bup'];
  let atkBullyCount = 0;
  let defBullyCount = 0;
  
  if (stepData.atk) {
    Object.keys(stepData.atk).forEach(key => {
      if (bullyRoles.includes(key)) atkBullyCount++;
    });
  }
  if (stepData.def) {
    Object.keys(stepData.def).forEach(key => {
      if (bullyRoles.includes(key)) defBullyCount++;
    });
  }
  
  // Need at least 3 bully players on each side for a proper formation
  if (atkBullyCount >= 3 && defBullyCount >= 3) {
    return { x: centerX, z: centerZ, zone: bullyZone };
  }
  
  return null;
}

/**
 * Calculates proper bully positions for a team
 * Returns a map of playerKey -> {x, z, facing}
 */
function calculateBullyPositions(bullyCenter, team, stepData) {
  const positions = {};
  const BC = BULLY_CONFIG;
  const isAttacking = team === 'attacking';
  
  // Attacking team faces right (+x direction), defending faces left (-x)
  // In a set-piece bully, attackers crouch and defenders stand
  // Front rows face each other across a small gap
  
  // X position of the front row line
  const frontRowX = isAttacking 
    ? bullyCenter.x - BC.frontRowGap / 2 - BC.engagementOffset
    : bullyCenter.x + BC.frontRowGap / 2;
  
  // Front row players positioned horizontally (same X, different Z)
  const frontRowPlayers = ['c1', 'sp1', 'post', 'sp2', 'c2'];
  const teamData = isAttacking ? stepData.atk : stepData.def;
  
  // Calculate Z positions centered on bully center
  // Order: c1 (bottom), sp1, post (center), sp2, c2 (top)
  frontRowPlayers.forEach((role, index) => {
    if (teamData && teamData[role]) {
      const offsetFromCenter = (index - 2) * BC.playerSpacing;  // -2, -1, 0, 1, 2
      positions[role] = {
        x: frontRowX,
        z: bullyCenter.z + offsetFromCenter,
        facing: isAttacking ? 0 : Math.PI  // Face the opposition
      };
    }
  });
  
  // Bup (back-up post) positioned behind the post
  if (teamData && teamData['bup']) {
    const bupX = isAttacking 
      ? frontRowX - BC.bupOffsetX 
      : frontRowX + BC.bupOffsetX;
    positions['bup'] = {
      x: bupX,
      z: bullyCenter.z,
      facing: isAttacking ? 0 : Math.PI
    };
  }
  
  return positions;
}

/**
 * Calculates facing direction based on team and context
 */
function calculateFacing(team, inBully = false) {
  // Attacking team faces right (towards defending goal = 0 radians)
  // Defending team faces left (towards attacking goal = PI radians)
  return team === 'attacking' ? 0 : Math.PI;
}

/**
 * Infers the appropriate pose based on scenario context
 */
function inferPose(playerKey, playerData, team, stepData, bullyFormation) {
  const bullyRoles = ['post', 'sp1', 'sp2', 'c1', 'c2', 'bup'];
  const isBullyRole = bullyRoles.includes(playerKey);
  
  // If we're in a bully formation and this is a bully role
  if (bullyFormation && isBullyRole) {
    // Attacking team crouches, defending team stands
    return team === 'attacking' ? 'bully_crouch' : 'bully_stand';
  }
  
  // Check if this player has the ball (within 2 units)
  const hasBall = stepData.ball && 
    Math.abs(stepData.ball.x - playerData.x) < 2 &&
    Math.abs(stepData.ball.y - playerData.y) < 2;
  
  if (hasBall) {
    return 'run_ball';
  }
  
  // Default to running without ball
  return 'run_noBall';
}

// ============================================
// SCENE MANAGER
// ============================================

const SceneManager = {
  players: new Map(),      // Map of playerId -> THREE.Group
  ball: null,              // Ball mesh
  currentStep: null,       // Current step data
  
  /**
   * Clears all players and ball from scene
   */
  clear(scene) {
    this.players.forEach((player, id) => {
      scene.remove(player);
      // Dispose geometries and materials
      player.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.players.clear();
    
    if (this.ball) {
      scene.remove(this.ball);
      this.ball = null;
    }
  },
  
  /**
   * Renders a scenario step
   */
  renderStep(scene, stepData, animate = true) {
    const COLORS = {
      attacking: 0x2980b9,  // Blue
      defending: 0xc0392b   // Red
    };
    
    this.currentStep = stepData;
    
    // Detect if we're in a bully formation
    const bullyFormation = detectBullyFormation(stepData);
    
    // Calculate proper bully positions if in formation
    let atkBullyPositions = {};
    let defBullyPositions = {};
    if (bullyFormation) {
      atkBullyPositions = calculateBullyPositions(bullyFormation, 'attacking', stepData);
      defBullyPositions = calculateBullyPositions(bullyFormation, 'defending', stepData);
    }
    
    // Track which players are in this step
    const activePlayerIds = new Set();
    
    // Process attacking team
    if (stepData.atk) {
      Object.entries(stepData.atk).forEach(([key, data]) => {
        const playerId = 'atk_' + key;
        activePlayerIds.add(playerId);
        
        // Use bully position if available, otherwise use scenario position
        const bullyPos = atkBullyPositions[key];
        
        this.updateOrCreatePlayer(
          scene, playerId, key, data, 'attacking', COLORS.attacking, 
          stepData, animate, bullyFormation, bullyPos
        );
      });
    }
    
    // Process defending team
    if (stepData.def) {
      Object.entries(stepData.def).forEach(([key, data]) => {
        const playerId = 'def_' + key;
        activePlayerIds.add(playerId);
        
        const bullyPos = defBullyPositions[key];
        
        this.updateOrCreatePlayer(
          scene, playerId, key, data, 'defending', COLORS.defending, 
          stepData, animate, bullyFormation, bullyPos
        );
      });
    }
    
    // Remove players no longer in scene
    this.players.forEach((player, id) => {
      if (!activePlayerIds.has(id)) {
        this.fadeOutAndRemove(scene, player, id, animate);
      }
    });
    
    // Update ball
    this.updateBall(scene, stepData.ball, animate);
    
    // Render zone highlights (bully area, sneaking zone, etc.)
    this.updateZones(scene, stepData.zones, animate);
    
    // Render arrows showing movement
    this.updateArrows(scene, stepData.arrs, animate);
    
    // Render floating annotations
    this.updateAnnotations(scene, stepData.ann, animate);
    
    // Update player labels
    this.updatePlayerLabels(scene);
  },
  
  /**
   * Updates existing player or creates new one
   */
  updateOrCreatePlayer(scene, playerId, key, data, team, color, stepData, animate, bullyFormation, bullyPos) {
    // Use bully position if provided, otherwise use scenario data
    let pos3d;
    let facing;
    
    if (bullyPos) {
      pos3d = { x: bullyPos.x, y: 0, z: bullyPos.z };
      facing = bullyPos.facing;
    } else {
      pos3d = scenarioTo3D(data.x, data.y);
      facing = calculateFacing(team);
    }
    
    const pose = inferPose(key, data, team, stepData, bullyFormation);
    const highlighted = data.hl || false;
    const highlightPart = data.hlPart || null;
    
    let player = this.players.get(playerId);
    
    if (player) {
      // Check if pose changed
      if (player.userData.pose !== pose) {
        this.replacePose(scene, playerId, key, data, team, color, stepData, pose, animate, pos3d, facing, highlighted, highlightPart);
        return;
      }
      
      // Update existing player position
      if (animate) {
        this.animatePlayerTo(player, pos3d, facing, highlighted, highlightPart);
      } else {
        player.position.set(pos3d.x, pos3d.y, pos3d.z);
        player.rotation.y = facing;
        window.PlayerFigures.updateHighlight(player, highlighted, highlightPart);
      }
    } else {
      // Create new player
      player = window.PlayerFigures.create(pose, color, highlighted, highlightPart);
      player.position.set(pos3d.x, pos3d.y, pos3d.z);
      player.rotation.y = facing;
      player.userData.playerId = playerId;
      player.userData.team = team;
      player.userData.key = key;
      player.userData.pose = pose;
      
      if (animate) {
        // Fade in
        player.traverse(child => {
          if (child.material && child.name !== 'playerGlow') {
            const originalOpacity = child.material.opacity;
            child.material.transparent = true;
            child.material.opacity = 0;
            this.animateValue(child.material, 'opacity', 0, originalOpacity, 500);
          }
        });
      }
      
      scene.add(player);
      this.players.set(playerId, player);
    }
  },
  
  /**
   * Replaces player with new pose
   */
  replacePose(scene, playerId, key, data, team, color, stepData, newPose, animate, pos3d, facing, highlighted, highlightPart) {
    const oldPlayer = this.players.get(playerId);
    if (!oldPlayer) return;
    
    // Create new player with new pose
    const newPlayer = window.PlayerFigures.create(newPose, color, highlighted, highlightPart);
    newPlayer.position.copy(oldPlayer.position);
    newPlayer.rotation.copy(oldPlayer.rotation);
    newPlayer.userData = { ...oldPlayer.userData, pose: newPose };
    
    // Animate to new position
    if (animate) {
      this.animatePlayerTo(newPlayer, pos3d, facing, highlighted, highlightPart);
      
      // Cross-fade
      oldPlayer.traverse(child => {
        if (child.material && child.name !== 'playerGlow') {
          this.animateValue(child.material, 'opacity', child.material.opacity, 0, 300);
        }
      });
      newPlayer.traverse(child => {
        if (child.material && child.name !== 'playerGlow') {
          const targetOpacity = child.material.opacity;
          child.material.opacity = 0;
          this.animateValue(child.material, 'opacity', 0, targetOpacity, 300);
        }
      });
      
      setTimeout(() => {
        scene.remove(oldPlayer);
        oldPlayer.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }, 300);
    } else {
      newPlayer.position.set(pos3d.x, pos3d.y, pos3d.z);
      newPlayer.rotation.y = facing;
      scene.remove(oldPlayer);
    }
    
    scene.add(newPlayer);
    this.players.set(playerId, newPlayer);
  },
  
  /**
   * Animates player to new position
   */
  animatePlayerTo(player, targetPos, targetFacing, highlighted, highlightPart) {
    const duration = 600;
    const startPos = player.position.clone();
    const startRotation = player.rotation.y;
    const startTime = performance.now();
    
    // Update highlight
    window.PlayerFigures.updateHighlight(player, highlighted, highlightPart);
    
    const targetVec = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      player.position.lerpVectors(startPos, targetVec, eased);
      
      // Smooth rotation (handle wrap-around)
      let rotDiff = targetFacing - startRotation;
      if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      player.rotation.y = startRotation + rotDiff * eased;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  },
  
  // ============================================
  // ZONE RENDERING
  // ============================================
  
  zones: [],  // Store zone meshes
  arrows: [], // Store arrow meshes
  annotations: [], // Store annotation sprites
  labels: [], // Store player label sprites
  showLabels: true, // Toggle for player labels
  
  /**
   * Updates zone highlights (bully area, sneaking zone, etc.)
   */
  updateZones(scene, zonesData, animate) {
    // Remove old zones
    this.zones.forEach(zone => {
      scene.remove(zone);
      zone.geometry.dispose();
      zone.material.dispose();
    });
    this.zones = [];
    
    if (!zonesData) return;
    
    zonesData.forEach(zone => {
      const zoneMesh = this.createZoneMesh(zone);
      if (zoneMesh) {
        if (animate) {
          zoneMesh.material.opacity = 0;
          this.animateValue(zoneMesh.material, 'opacity', 0, zoneMesh.userData.targetOpacity, 400);
        }
        scene.add(zoneMesh);
        this.zones.push(zoneMesh);
      }
    });
  },
  
  /**
   * Creates a zone highlight mesh
   */
  createZoneMesh(zone) {
    // Zone types: 'bully', 'sneaking', 'onTheLine', 'rougeable'
    let color, opacity;
    
    switch (zone.t) {
      case 'bully':
        color = 0xf39c12;  // Orange
        opacity = 0.15;
        break;
      case 'sneaking':
        color = 0xe74c3c;  // Red
        opacity = 0.12;
        break;
      case 'onTheLine':
        color = 0x3498db;  // Blue
        opacity = 0.12;
        break;
      case 'rougeable':
        color = 0x27ae60;  // Green
        opacity = 0.15;
        break;
      default:
        color = 0xffffff;
        opacity = 0.1;
    }
    
    const geometry = new THREE.PlaneGeometry(zone.w, zone.h);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;  // Lay flat on ground
    mesh.position.set(
      zone.x + zone.w / 2,
      0.02,  // Just above ground
      zone.y + zone.h / 2
    );
    mesh.userData.targetOpacity = opacity;
    mesh.name = 'zone_' + zone.t;
    
    return mesh;
  },
  
  // ============================================
  // PART 7: ARROWS / MOVEMENT INDICATORS
  // ============================================
  
  /**
   * Updates arrows showing ball movement or player runs
   */
  updateArrows(scene, arrowsData, animate) {
    // Remove old arrows
    this.arrows.forEach(arrow => {
      scene.remove(arrow);
      arrow.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    this.arrows = [];
    
    if (!arrowsData) return;
    
    arrowsData.forEach((arrowData, index) => {
      const arrow = this.createArrow3D(arrowData);
      if (arrow) {
        if (animate) {
          // Animate arrow drawing
          arrow.scale.set(0, 0, 0);
          this.animateArrowIn(arrow, index * 150); // Stagger animations
        }
        scene.add(arrow);
        this.arrows.push(arrow);
      }
    });
  },
  
  /**
   * Creates a 3D arrow from start to end point
   */
  createArrow3D(arrowData) {
    const group = new THREE.Group();
    group.name = 'arrow';
    
    // Convert 2D coords to 3D
    const start = new THREE.Vector3(arrowData.from.x, 0.3, arrowData.from.y);
    const end = new THREE.Vector3(arrowData.to.x, 0.3, arrowData.to.y);
    
    // Calculate direction and length
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    if (length < 0.5) return null; // Too short
    
    direction.normalize();
    
    // Arrow color (default yellow, or from data)
    const color = arrowData.c ? parseInt(arrowData.c.replace('#', '0x')) : 0xf1c40f;
    
    // Arrow shaft (curved tube)
    const shaftLength = length - 0.8; // Leave room for arrowhead
    if (shaftLength > 0) {
      // Create curved path for the arrow
      const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      midPoint.y += length * 0.1; // Arc upward slightly
      
      const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
      
      const shaftMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.9,
        roughness: 0.3,
        metalness: 0.2
      });
      
      const shaft = new THREE.Mesh(tubeGeo, shaftMat);
      shaft.castShadow = true;
      group.add(shaft);
    }
    
    // Arrowhead (cone)
    const headGeo = new THREE.ConeGeometry(0.25, 0.6, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.95,
      roughness: 0.2,
      metalness: 0.3
    });
    
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.copy(end);
    head.position.y = 0.3;
    
    // Rotate arrowhead to point in direction
    const angle = Math.atan2(direction.x, direction.z);
    head.rotation.x = Math.PI / 2;
    head.rotation.z = -angle;
    head.castShadow = true;
    group.add(head);
    
    // Glow effect
    const glowGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(end);
    glow.position.y = 0.3;
    group.add(glow);
    
    // Store label if provided
    if (arrowData.lbl) {
      group.userData.label = arrowData.lbl;
      const label = this.createTextSprite(arrowData.lbl, color, 0.8);
      const labelPos = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      labelPos.y = 1.5;
      label.position.copy(labelPos);
      group.add(label);
    }
    
    // Animation flag
    group.userData.animated = arrowData.anim || false;
    
    return group;
  },
  
  /**
   * Animates arrow appearing with a drawing effect
   */
  animateArrowIn(arrow, delay = 0) {
    setTimeout(() => {
      const duration = 400;
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        arrow.scale.set(eased, eased, eased);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }, delay);
  },
  
  // ============================================
  // PART 8: LABELS & ANNOTATIONS
  // ============================================
  
  /**
   * Updates floating annotations (info boxes, warnings, scoring indicators)
   */
  updateAnnotations(scene, annotationsData, animate) {
    // Remove old annotations
    this.annotations.forEach(ann => {
      scene.remove(ann);
      if (ann.material.map) ann.material.map.dispose();
      ann.material.dispose();
    });
    this.annotations = [];
    
    if (!annotationsData) return;
    
    annotationsData.forEach((annData, index) => {
      const annotation = this.createAnnotation(annData);
      if (annotation) {
        if (animate) {
          annotation.scale.set(0, 0, 0);
          this.animateAnnotationIn(annotation, index * 100);
        }
        scene.add(annotation);
        this.annotations.push(annotation);
      }
    });
  },
  
  /**
   * Creates a floating annotation sprite
   */
  createAnnotation(annData) {
    // Annotation types: 'info', 'warning', 'scoring'
    let bgColor, textColor, icon;
    
    switch (annData.t) {
      case 'warning':
        bgColor = '#e74c3c';
        textColor = '#ffffff';
        icon = '⚠';
        break;
      case 'scoring':
        bgColor = '#27ae60';
        textColor = '#ffffff';
        icon = '★';
        break;
      case 'info':
      default:
        bgColor = '#3498db';
        textColor = '#ffffff';
        icon = 'ℹ';
        break;
    }
    
    // Create canvas for the annotation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    // Background with rounded corners
    ctx.fillStyle = bgColor;
    this.roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 16);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    this.roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 16);
    ctx.stroke();
    
    // Icon
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 24, canvas.height / 2);
    
    // Text
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.fillText(annData.txt, 80, canvas.height / 2);
    
    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.position.set(annData.x, 3.5, annData.y);
    sprite.scale.set(8, 2, 1);
    sprite.name = 'annotation';
    
    return sprite;
  },
  
  /**
   * Animates annotation appearing with bounce
   */
  animateAnnotationIn(annotation, delay = 0) {
    setTimeout(() => {
      const duration = 500;
      const startTime = performance.now();
      const targetScale = annotation.scale.clone().set(8, 2, 1);
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Elastic ease out
        const eased = 1 - Math.pow(2, -10 * progress) * Math.cos(progress * Math.PI * 2);
        
        annotation.scale.set(
          targetScale.x * eased,
          targetScale.y * eased,
          targetScale.z * eased
        );
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }, delay);
  },
  
  /**
   * Updates player labels floating above them
   */
  updatePlayerLabels(scene) {
    // Remove old labels
    this.labels.forEach(label => {
      scene.remove(label);
      if (label.material.map) label.material.map.dispose();
      label.material.dispose();
    });
    this.labels = [];
    
    if (!this.showLabels) return;
    
    // Create labels for each player
    this.players.forEach((player, playerId) => {
      const data = player.userData;
      const key = data.key;
      
      // Get role name or use key
      const roleNames = {
        'post': 'Post',
        'sp1': 'Side Post',
        'sp2': 'Side Post',
        'c1': 'Corner',
        'c2': 'Corner',
        'bup': 'Bup',
        'fly': 'Fly',
        'short': 'Short',
        'long1': 'Long',
        'long2': 'Long',
        'goals': 'Goals'
      };
      
      const labelText = roleNames[key] || key.toUpperCase();
      const teamColor = data.team === 'attacking' ? 0x2980b9 : 0xc0392b;
      
      const label = this.createPlayerLabel(labelText, teamColor, data.highlighted);
      
      // Position well above player head (players are ~1.8m tall)
      const playerPos = player.position.clone();
      playerPos.y = 12;  // Much higher for 5x scale players (~9m tall)
      label.position.copy(playerPos);
      
      // Make sure label renders on top of everything
      label.renderOrder = 999;
      
      // Store reference to player for updates
      label.userData.playerId = playerId;
      
      scene.add(label);
      this.labels.push(label);
    });
  },
  
  /**
   * Creates a label sprite for a player - cleaner wireframe style
   */
  createPlayerLabel(text, color, highlighted) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Semi-transparent dark background
    ctx.fillStyle = 'rgba(5, 10, 8, 0.85)';
    this.roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 8);
    ctx.fill();
    
    // Colored border matching team/highlight
    const borderColor = highlighted ? '#f1c40f' : `#${color.toString(16).padStart(6, '0')}`;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    this.roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 8);
    ctx.stroke();
    
    // Text in team/highlight color
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = borderColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.2, 0.55, 1);
    sprite.name = 'playerLabel';
    sprite.renderOrder = 999;
    
    return sprite;
  },
  
  /**
   * Creates a simple text sprite (for arrow labels)
   */
  createTextSprite(text, color, scale = 1) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 8);
    ctx.fill();
    
    // Text
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3 * scale, 0.75 * scale, 1);
    
    return sprite;
  },
  
  /**
   * Helper: Draw rounded rectangle
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },
  
  /**
   * Toggle player labels visibility
   */
  toggleLabels(scene) {
    this.showLabels = !this.showLabels;
    this.updatePlayerLabels(scene);
  },
  
  /**
   * Fades out and removes a player
   */
  fadeOutAndRemove(scene, player, playerId, animate) {
    if (animate) {
      player.traverse(child => {
        if (child.material) {
          this.animateValue(child.material, 'opacity', child.material.opacity, 0, 400);
        }
      });
      
      setTimeout(() => {
        scene.remove(player);
        player.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.players.delete(playerId);
      }, 400);
    } else {
      scene.remove(player);
      this.players.delete(playerId);
    }
  },
  
  /**
   * Updates ball position
   */
  updateBall(scene, ballData, animate) {
    if (!ballData) {
      // Remove ball if no data
      if (this.ball) {
        if (animate) {
          this.fadeOutBall(scene);
        } else {
          scene.remove(this.ball);
          this.ball = null;
        }
      }
      return;
    }
    
    const pos3d = scenarioTo3D(ballData.x, ballData.y);
    pos3d.y = 0.55; // Ball radius * 5 scale above ground
    
    if (!this.ball) {
      // Create ball
      this.ball = window.PlayerFigures.createBall();
      this.ball.position.set(pos3d.x, pos3d.y, pos3d.z);
      
      if (animate) {
        this.ball.scale.setScalar(0);
        this.animateValue(this.ball.scale, 'x', 0, 1, 300);
        this.animateValue(this.ball.scale, 'y', 0, 1, 300);
        this.animateValue(this.ball.scale, 'z', 0, 1, 300);
      }
      
      scene.add(this.ball);
    } else {
      // Move ball
      if (animate) {
        this.animateBallTo(pos3d);
      } else {
        this.ball.position.set(pos3d.x, pos3d.y, pos3d.z);
      }
    }
  },
  
  /**
   * Animates ball to position
   */
  animateBallTo(targetPos) {
    const duration = 500;
    const startPos = this.ball.position.clone();
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.ball.position.lerpVectors(startPos, new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), eased);
      
      // Add a slight bounce
      const bounceHeight = Math.sin(progress * Math.PI) * 0.3;
      this.ball.position.y = targetPos.y + bounceHeight;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  },
  
  /**
   * Fades out ball
   */
  fadeOutBall(scene) {
    const ball = this.ball;
    this.ball = null;
    
    this.animateValue(ball.scale, 'x', 1, 0, 300);
    this.animateValue(ball.scale, 'y', 1, 0, 300);
    this.animateValue(ball.scale, 'z', 1, 0, 300);
    
    setTimeout(() => {
      scene.remove(ball);
    }, 300);
  },
  
  /**
   * Generic value animator helper
   */
  animateValue(object, property, from, to, duration) {
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      object[property] = from + (to - from) * eased;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
};

// Export
window.SceneManager = SceneManager;
