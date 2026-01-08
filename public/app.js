// State
const S = {
  threadId: null,
  scenario: null,
  seq: [],
  step: 0,
  playing: false,
  interval: null,
  labels: false,
  diag: false,
  // Camera state - viewBox based
  vb: { x: -5, y: -5, w: 120, h: 85 }, // Current viewBox
  defaultVb: { x: -5, y: -5, w: 120, h: 85 }, // Default full view
  // Pan state
  isPanning: false,
  panStart: { x: 0, y: 0 },
  vbStart: { x: 0, y: 0 }
};


// Scenarios loaded from external JSON file
let SCENARIOS = {};

// Load scenarios on startup
async function loadScenarios() {
  try {
    const res = await fetch('scenarios.json');
    SCENARIOS = await res.json();
    buildBar();
  } catch (e) {
    console.error('Failed to load scenarios:', e);
  }
}


// Local explanations for offline mode
const EXPLANATIONS = {
  sneaking: `**Sneaking** is one of the most important infringements in Field Game.

A player is **Sneaking** if they have both feet fully in front of the ball when:
1. A **Behind on their side is "making ground running-with-the-ball"** - any teammate ahead of the ball carrier is Sneaking
2. Any **Bully-player or Fly touches the ball** (unless in a Tightly-Formed Bully)
3. After a **Behind kicks**, if they are in front of both the ball AND all opposition Bully-players

**Penalty:** Free Kick to the non-offending team.

Watch the diagram - it shows how a Fly becomes Sneaking when they move ahead of the Short Behind who is running with the ball.`,
  onTheLine: `**On-the-Line** rules apply when the ball is between the goal-line and the 3-yard line, under an attacker's control.

**Key Rules:**
- The **attacker must keep the ball moving** - if stopped by a defender, they have moments to restart
- **Defenders must constantly engage** - they must be in playing distance and genuinely attempt to play the ball
- Special **Sneaking-on-the-Line** rules apply for positioning

**Penalties:**
- Defender infringement = **1 Point + Free Kick on 3-yard line**
- Attacker infringement = Goal-kick for defenders`,
  rouge: `A **Rouge** is Field Game's unique scoring mechanism worth **5 points** (plus a Conversion attempt).

The ball becomes **Rougeable** if it crosses the goal-line (extended infinitely) off a defender.

**Scoring:**
- First **attacker hand touch** = ROUGE (5 pts + Conversion)
- First **defender hand touch** = Attackers choose: 3 pts OR Free Kick on 3-yard line`,
  conversion: `After scoring a **Rouge**, the attacking team attempts a **Conversion** (worth 2 points).

**Setup:**
- Ball placed at the **tramline/3-yard line intersection**
- Defenders must start **at least 3 yards from the ball**

**Rules:**
- Attacker must keep ball moving along the 3-yard line
- If attacker forces another Rougeable = **Conversion scored!**`,
  kickoff: `The game starts with a **Set-Piece Bully** at the centre of the pitch.

**Formation (11-a-side):**
- **7 Bully players:** Post, 2 Side-Posts, 3 Corners, Bup
- **1 Fly** (behind the Bully)
- **3 Behinds:** Short + 2 Longs

**Procedure:**
1. Team that **lost the toss has "Heads"** (crouches)
2. Ball inserted along the tunnel by a **Corner without Heads**`,
  furking: `**Furking** (Law N) is the technique of hooking or heeling the ball backwards within a Tightly-Formed-Bully.

**LEGAL:** Ball may be hooked/heeled backwards but must stay WITHIN the Bully.

**ILLEGAL:** Ball must NOT be played OUT backwards from the Bully. If it leaves backwards, it must be returned immediately.

**Also:** A Bully-player breaking with the ball at their feet must take it forwards or sideways, never backwards.

**Penalty:** Free Kick to the non-offending team.`,
  cornering: `**Cornering** (Law Q) means failing to track the lateral movement of the ball.

**The Rule:** Players must stay in line with the ball's sideways position. If the ball moves left or right, players must track it.

**When Cornering:**
- **Bully-players and Flys** cannot touch the ball
- **Behinds** may tackle and kick, but cannot "make-ground-running-with-the-ball"

**Penalty:** Set-Piece-Bully (Free Kick only for extreme "professional foul" cases).

The umpire allows a "zone of tolerance" but players must make genuine effort to stay in line.`,
  bullyRouge: `A **Bully-Rouge** occurs when the ball crosses the goal-line while still within a Tightly-Formed-Bully.

This is one of the four ways a ball becomes **Rougeable**:
1. Directly off a defender
2. Rebounding off attacker after defender played it
3. **While within a Tightly-Formed-Bully** (Bully-Rouge)
4. Kicked directly from a Tightly-Formed-Bully (Contact-Rouge)

The attacking team can then touch the ball with their hand to score a **Rouge (5 points)**.`,
  goal: `A **Goal** is worth **3 points** and is scored when the ball passes between the goal-posts and under the bar.

**Penalty-Goal:** If a defender deliberately handles the ball to prevent a goal, a Penalty-Goal (3 points) is awarded instead, and the offender receives a Yellow card.

A Goal scored during a **Conversion attempt** is also worth 3 points (instead of the usual 2 for a Conversion).`,
  passingBack: `**Passing Back** (Law U) occurs when the ball travels backwards after a deliberate attempt to play it forward.

**Key Points:**
- If you try to kick forward but it goes back, the same player must be next to play it
- Deliberate back passes are very rare and result in a **Free Kick**
- Non-deliberate cases result in a **Set-Piece-Bully**

**The restart** is from where the ball was originally played (not where it was received).

**Exception:** Within a Tightly-Formed-Bully, backwards play is allowed (see Furking).`,
  hands: `**Hands** (Law P) - Players must not deliberately play the ball with their arm below the elbow.

**Exception:** When the ball is **Rougeable**, handling is permitted to score a Rouge.

**Not Hands:**
- Ball hitting hand/arm **within body-line** = play on
- Ball hitting hand/arm **outside body-line** may be non-deliberate offence

**Penalties:**
- Deliberate: **Free Kick**
- Non-deliberate: **Set-Piece-Bully**
- Preventing a Goal by handling: **Penalty-Goal + Yellow card**`,
  freeKick: `A **Free Kick** (Law G) is awarded for deliberate infringements.

**Taking a Free Kick:**
- Ball placed at spot of infringement
- Taker may kick, pass, or dribble forward
- Opposition must be **3 yards away**
- Ball is in play when kicked

**Note:** Unlike a Set-Piece-Bully, a Free Kick gives the attacking team direct possession and momentum - it's a more severe penalty.`,
  sneakingOnTheLine: `**Sneaking-on-the-Line** (Law J) has special rules different from normal Sneaking.

**Attackers are Sneaking** if they are:
- Nearer the goal AND nearer the goal-line than the ball

**Defenders are Sneaking** if they are:
- Nearer the touchline AND nearer the goal-line than the ball (waiting wide)

**Penalties:**
- Defender infringement: **Point + Free Kick**
- Attacker infringement: **Goal-kick**
- Defender waiting upfield: **Free Kick on 15-yard line**`,
  playingOnGround: `**Playing-on-the-Ground** (Law S) - Players with any body part (other than feet) touching the ground must not interfere with play.

**Key Rules:**
- **No sliding tackles** of any kind - even if not on ground at point of contact
- If playing ball causes you to fall afterwards, that's OK
- Bicycle/overhead kicks judged on danger, not ground contact

**Penalties:**
- Unintentional: **Set-Piece-Bully**
- Intentional: **Free Kick**
- Preventing Goal by playing on ground: **Penalty-Goal**`,
  heading: `**Heading** (Law W) - Deliberate heading is **prohibited** since 2024.

**The Exception:** A **Behind (Goals)** standing between the posts AND inside the 3-yard line AND trying to prevent a Goal may head the ball.

**Penalties:**
- Normal heading offence: **Free Kick**
- Heading to prevent a Goal (by non-Behind): **Penalty-Goal**
- Heading to prevent Rougeable: **Penalty-Point** + ball treated as Rougeable

This rule was introduced for player safety following research on heading risks.`
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadScenarios();
  setupInput();
  setupPanZoom();
  applyViewBox(S.defaultVb, false);
});

function buildBar() {
  document.getElementById('scenarioBar').innerHTML = Object.entries(SCENARIOS)
    .map(([k, s]) => `<button class="scenario-tab" data-k="${k}" onclick="loadScenario('${k}')">${s.name}</button>`)
    .join('');
}

function setupInput() {
  const i = document.getElementById('chatInput');
  i.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  i.addEventListener('input', () => { i.style.height = 'auto'; i.style.height = Math.min(i.scrollHeight, 120) + 'px'; });
}

// =============== CAMERA (ViewBox based) ===============
function applyViewBox(vb, animate = true) {
  const svg = document.getElementById('pitch');
  S.vb = { ...vb };
  if (animate) {
    svg.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
  } else {
    svg.style.transition = 'none';
  }
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  updateZoomInfo();
}

function updateZoomInfo() {
  const zoom = Math.round((S.defaultVb.w / S.vb.w) * 100);
  document.getElementById('zoomInfo').textContent = zoom + '%';
}

function zoomIn() {
  const cx = S.vb.x + S.vb.w / 2;
  const cy = S.vb.y + S.vb.h / 2;
  const nw = Math.max(S.vb.w * 0.7, 20);
  const nh = Math.max(S.vb.h * 0.7, 15);
  applyViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
}

function zoomOut() {
  const cx = S.vb.x + S.vb.w / 2;
  const cy = S.vb.y + S.vb.h / 2;
  const nw = Math.min(S.vb.w * 1.4, 140);
  const nh = Math.min(S.vb.h * 1.4, 100);
  applyViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
}

function resetCamera() {
  applyViewBox(S.defaultVb);
  if (S.scenario && SCENARIOS[S.scenario]) {
    loadScenario(S.scenario);
  }
}

// =============== PAN & ZOOM GESTURES ===============
function setupPanZoom() {
  const vp = document.getElementById('viewport');
  const svg = document.getElementById('pitch');

  // Mouse pan
  vp.addEventListener('mousedown', e => {
    if (e.target.closest('.zoom-btn')) return;
    S.isPanning = true;
    S.panStart = { x: e.clientX, y: e.clientY };
    S.vbStart = { x: S.vb.x, y: S.vb.y };
    vp.classList.add('dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!S.isPanning) return;
    const svg = document.getElementById('pitch');
    const rect = svg.getBoundingClientRect();
    const scale = S.vb.w / rect.width;
    const dx = (e.clientX - S.panStart.x) * scale;
    const dy = (e.clientY - S.panStart.y) * scale;
    S.vb.x = S.vbStart.x - dx;
    S.vb.y = S.vbStart.y - dy;
    svg.style.transition = 'none';
    svg.setAttribute('viewBox', `${S.vb.x} ${S.vb.y} ${S.vb.w} ${S.vb.h}`);
  });

  window.addEventListener('mouseup', () => {
    S.isPanning = false;
    vp.classList.remove('dragging');
  });

  // Mouse wheel zoom
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const svg = document.getElementById('pitch');
    const rect = svg.getBoundingClientRect();
    
    // Get mouse position in SVG coordinates
    const mx = ((e.clientX - rect.left) / rect.width) * S.vb.w + S.vb.x;
    const my = ((e.clientY - rect.top) / rect.height) * S.vb.h + S.vb.y;
    
    const factor = e.deltaY > 0 ? 1.15 : 0.85;
    const nw = Math.max(20, Math.min(140, S.vb.w * factor));
    const nh = Math.max(15, Math.min(100, S.vb.h * factor));
    
    // Zoom towards mouse position
    const nx = mx - (mx - S.vb.x) * (nw / S.vb.w);
    const ny = my - (my - S.vb.y) * (nh / S.vb.h);
    
    S.vb = { x: nx, y: ny, w: nw, h: nh };
    svg.style.transition = 'none';
    svg.setAttribute('viewBox', `${S.vb.x} ${S.vb.y} ${S.vb.w} ${S.vb.h}`);
    updateZoomInfo();
  }, { passive: false });
}

// =============== VIEW MANAGEMENT ===============
function setView(v) {
  const c = document.getElementById('chatPanel'), d = document.getElementById('diagramPanel');
  document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
  c.classList.remove('collapsed', 'expanded'); d.classList.remove('collapsed');
  if (v === 'chat') { document.getElementById('vChat').classList.add('active'); c.classList.add('expanded'); d.classList.add('collapsed'); }
  else if (v === 'diagram') { document.getElementById('vDiagram').classList.add('active'); c.classList.add('collapsed'); }
  else { document.getElementById('vSplit').classList.add('active'); }
}

// =============== CHAT ===============
function askQ(q) { document.getElementById('chatInput').value = q; sendMsg(); }
function toggleDiag() { S.diag = !S.diag; document.getElementById('diagramBtn').classList.toggle('active', S.diag); }

async function sendMsg() {
  const i = document.getElementById('chatInput'), txt = i.value.trim(); if (!txt) return;
  const w = document.getElementById('welcome'); if (w) w.style.display = 'none';
  addMsg(txt, 'user'); i.value = ''; i.style.height = 'auto';
  const lid = addLoading();

  // Check for local scenario match
  const lower = txt.toLowerCase();
  let match = null;
  if (lower.includes('sneak')) match = 'sneaking';
  else if (lower.includes('on-the-line') || lower.includes('on the line')) match = 'onTheLine';
  else if (lower.includes('rouge') || lower.includes('rougeable')) match = 'rouge';
  else if (lower.includes('conversion')) match = 'conversion';
  else if (lower.includes('kick-off') || lower.includes('kickoff') || lower.includes('formation')) match = 'kickoff';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: txt, threadId: S.threadId, requestDiagram: S.diag })
    });
    const d = await res.json();
    rmMsg(lid);
    if (d.error) {
      if (match) { addMsg(EXPLANATIONS[match] || 'Here is a visual explanation:', 'assistant', true); loadScenario(match); setView('split'); }
      else { addMsg('Sorry, something went wrong. Try asking about Sneaking, On-the-Line, Rouge, Conversion, or Kick-off.', 'assistant'); }
      return;
    }
    S.threadId = d.threadId;
    addMsg(d.response, 'assistant', !!d.diagram);
    if (d.diagram) { loadAI(d.diagram); setView('split'); }
  } catch (e) {
    rmMsg(lid);
    if (match) { addMsg(EXPLANATIONS[match] || 'Here is a visual explanation:', 'assistant', true); loadScenario(match); setView('split'); }
    else { addMsg('I am currently offline, but I can show you visual scenarios! Try asking about Sneaking, On-the-Line, Rouge, Conversion, or Kick-off.', 'assistant'); }
  }
  S.diag = false; document.getElementById('diagramBtn').classList.remove('active');
}

function addMsg(txt, role, hasDiag = false) {
  const c = document.getElementById('chatMessages'), id = 'm' + Date.now();
  const av = role === 'user' ? 'U' : `<img src="ralph.png" alt="R" onerror="this.style.display='none';this.parentElement.textContent='R';">`;
  const badge = hasDiag ? `<div class="diagram-badge" onclick="setView('split')">View Diagram</div>` : '';
  c.insertAdjacentHTML('beforeend', `<div class="message ${role}" id="${id}"><div class="message-avatar">${av}</div><div class="message-content">${fmt(txt)}${badge}</div></div>`);
  c.scrollTop = c.scrollHeight; return id;
}
function addLoading() {
  const c = document.getElementById('chatMessages'), id = 'l' + Date.now();
  c.insertAdjacentHTML('beforeend', `<div class="message assistant" id="${id}"><div class="message-avatar"><img src="ralph.png" alt="R" onerror="this.style.display='none';this.parentElement.textContent='R';"></div><div class="message-content"><div class="typing"><span></span><span></span><span></span></div></div></div>`);
  c.scrollTop = c.scrollHeight; return id;
}
function rmMsg(id) { document.getElementById(id)?.remove(); }
function fmt(t) { return t.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`).join(''); }

// =============== SCENARIOS ===============
function loadScenario(k) {
  const sc = SCENARIOS[k]; if (!sc) return; stop();
  S.scenario = k; S.seq = sc.seq; S.step = 0;
  document.querySelectorAll('.scenario-tab').forEach(t => t.classList.toggle('active', t.dataset.k === k));
  document.getElementById('diagTitle').textContent = sc.name;
  document.getElementById('diagDesc').textContent = sc.desc;
  render(0, true); updateCtrl(); setView('split');
}

function loadAI(diag) {
  stop(); S.scenario = 'ai'; S.seq = diag.sequence || [diag]; S.step = 0;
  document.querySelectorAll('.scenario-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('diagTitle').textContent = diag.title || 'Visual Explanation';
  document.getElementById('diagDesc').textContent = diag.description || '';
  render(0, true); updateCtrl();
}

function render(idx, anim = true) {
  if (!S.seq[idx]) return;
  const st = S.seq[idx]; S.step = idx;
  
  // Apply camera (viewBox)
  if (st.vb) applyViewBox(st.vb, anim);
  
  // Render layers with animation
  rZones(st.zones || [], anim);
  rArrows(st.arrs || [], anim);
  rPlayers(st.atk || {}, 'attacking', anim);
  rPlayers(st.def || {}, 'defending', anim);
  rBall(st.ball, anim);
  rAnn(st.ann || [], anim);
  
  document.getElementById('caption').textContent = st.caption || '';
  updateCtrl();
}

function rZones(zones, animate = true) {
  const layer = document.getElementById('zones');
  const duration = animate ? 400 : 0;
  
  // Fade out existing zones
  const existing = layer.querySelectorAll('.zone');
  existing.forEach(el => {
    el.style.transition = `opacity ${duration}ms ease-out`;
    el.style.opacity = '0';
  });
  
  // After fade out, replace with new zones
  setTimeout(() => {
    layer.innerHTML = zones.map(z =>
      `<g class="zone ${z.t}" style="opacity: 0"><rect class="zone-fill" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}"/><rect class="zone-border" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}"/></g>`
    ).join('');
    
    // Fade in new zones
    requestAnimationFrame(() => {
      layer.querySelectorAll('.zone').forEach(el => {
        el.style.transition = `opacity ${duration}ms ease-out`;
        el.style.opacity = '1';
      });
    });
  }, existing.length > 0 ? duration : 0);
}

// Dynamic scale based on zoom (smaller elements when zoomed in)
function getScale() {
  return Math.max(0.35, Math.min(1.0, S.vb.w / 120));
}

function rArrows(arrs, animate = true) {
  const layer = document.getElementById('arrows');
  const sc = getScale();
  const duration = animate ? 400 : 0;
  
  // Fade out existing arrows
  const existing = layer.querySelectorAll('g');
  existing.forEach(el => {
    el.style.transition = `opacity ${duration}ms ease-out`;
    el.style.opacity = '0';
  });
  
  // After fade out, replace with new arrows
  setTimeout(() => {
    layer.innerHTML = arrs.map(a => {
      const mid = { x: (a.from.x + a.to.x) / 2, y: (a.from.y + a.to.y) / 2 - 1.5 * sc };
      return `<g style="opacity: 0">
        <line class="arrow-path" x1="${a.from.x}" y1="${a.from.y}" x2="${a.to.x}" y2="${a.to.y}" stroke="${a.c || '#3498db'}" stroke-width="${0.5*sc}" marker-end="url(#arrow)" style="color:${a.c || '#3498db'}"/>
        ${a.lbl ? `<text class="arrow-label" x="${mid.x}" y="${mid.y}" font-size="${1.4*sc}" stroke-width="${0.4*sc}">${a.lbl}</text>` : ''}
      </g>`;
    }).join('');
    
    // Fade in and animate new arrows
    requestAnimationFrame(() => {
      layer.querySelectorAll('g').forEach(el => {
        el.style.transition = `opacity ${duration}ms ease-out`;
        el.style.opacity = '1';
      });
    });
  }, existing.length > 0 ? duration : 0);
}

function rPlayers(players, team, animate = true) {
  const layer = document.getElementById('players');
  const sc = getScale();
  const r = 2.2 * sc;
  const fs = 1.6 * sc;
  const duration = animate ? 600 : 0;
  
  // Get existing players of this team
  const existing = {};
  layer.querySelectorAll(`.player.${team}`).forEach(el => {
    existing[el.dataset.k] = el;
  });
  
  // Track which players are in the new state
  const newKeys = new Set(Object.keys(players));
  
  // Update or create players
  Object.entries(players).forEach(([k, p]) => {
    const cls = ['player', team, p.hl ? 'highlight' : '', p.sn ? 'sneaking' : '', p.cn ? 'cornering' : ''].filter(Boolean).join(' ');
    
    if (existing[k]) {
      // Animate existing player to new position
      const el = existing[k];
      el.className.baseVal = cls;
      el.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      el.setAttribute('transform', `translate(${p.x},${p.y})`);
      
      // Update sizes if zoom changed
      const shadow = el.querySelector('.player-shadow');
      const ring = el.querySelector('.player-ring');
      const body = el.querySelector('.player-body');
      const label = el.querySelector('.player-label');
      const role = el.querySelector('.player-role');
      
      if (shadow) { shadow.setAttribute('cy', r*0.5); shadow.setAttribute('rx', r*0.9); shadow.setAttribute('ry', r*0.35); }
      if (ring) { ring.setAttribute('r', r*1.5); ring.setAttribute('stroke-width', 0.3*sc); }
      if (body) { body.setAttribute('r', r); }
      if (label) { label.setAttribute('font-size', fs); label.textContent = p.l || ''; }
      if (role) { role.setAttribute('y', r*2.5); role.setAttribute('font-size', fs*0.75); role.textContent = p.r || ''; }
      
      delete existing[k];
    } else {
      // Create new player with fade-in
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', cls);
      g.dataset.k = k;
      g.setAttribute('transform', `translate(${p.x},${p.y})`);
      g.style.opacity = '0';
      g.innerHTML = `
        <ellipse class="player-shadow" cx="0" cy="${r*0.5}" rx="${r*0.9}" ry="${r*0.35}"/>
        <circle class="player-ring" r="${r*1.5}" stroke-width="${0.3*sc}"/>
        <circle class="player-body" r="${r}"/>
        <text class="player-label" font-size="${fs}">${p.l || ''}</text>
        <text class="player-role" y="${r*2.5}" font-size="${fs*0.75}">${p.r || ''}</text>
      `;
      layer.appendChild(g);
      // Trigger fade-in
      requestAnimationFrame(() => {
        g.style.transition = `opacity ${duration}ms ease-out`;
        g.style.opacity = '1';
      });
    }
  });
  
  // Fade out and remove players no longer present
  Object.values(existing).forEach(el => {
    el.style.transition = `opacity ${duration}ms ease-out`;
    el.style.opacity = '0';
    setTimeout(() => el.remove(), duration);
  });
}

function rBall(ball, animate = true) {
  const layer = document.getElementById('ball');
  const sc = getScale();
  const r = 1.5 * sc;
  const duration = animate ? 600 : 0;
  
  if (!ball) {
    // Fade out ball if exists
    const existing = layer.querySelector('.ball');
    if (existing) {
      existing.style.transition = `opacity ${duration}ms ease-out`;
      existing.style.opacity = '0';
      setTimeout(() => { layer.innerHTML = ''; }, duration);
    }
    return;
  }
  
  const existing = layer.querySelector('.ball');
  
  if (existing) {
    // Animate existing ball to new position
    existing.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    existing.setAttribute('transform', `translate(${ball.x},${ball.y})`);
    
    // Update sizes
    const shadow = existing.querySelector('.ball-shadow');
    const glow = existing.querySelector('.ball-glow');
    const body = existing.querySelector('.ball-body');
    const highlight = existing.querySelector('.ball-highlight');
    
    if (shadow) { shadow.setAttribute('cy', r*0.5); shadow.setAttribute('rx', r*0.8); shadow.setAttribute('ry', r*0.3); }
    if (glow) { glow.setAttribute('r', r*1.8); }
    if (body) { body.setAttribute('r', r); body.setAttribute('stroke-width', 0.3*sc); }
    if (highlight) { highlight.setAttribute('cx', -r*0.3); highlight.setAttribute('cy', -r*0.3); highlight.setAttribute('r', r*0.35); }
  } else {
    // Create new ball with fade-in
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ball');
    g.setAttribute('transform', `translate(${ball.x},${ball.y})`);
    g.style.opacity = '0';
    g.innerHTML = `
      <ellipse class="ball-shadow" cx="0" cy="${r*0.5}" rx="${r*0.8}" ry="${r*0.3}"/>
      <circle class="ball-glow" r="${r*1.8}"/>
      <circle class="ball-body" r="${r}" stroke-width="${0.3*sc}"/>
      <circle class="ball-highlight" cx="${-r*0.3}" cy="${-r*0.3}" r="${r*0.35}"/>
    `;
    layer.appendChild(g);
    requestAnimationFrame(() => {
      g.style.transition = `opacity ${duration}ms ease-out`;
      g.style.opacity = '1';
    });
  }
}

function rAnn(anns, animate = true) {
  const layer = document.getElementById('annotations');
  const sc = getScale();
  const fs = 1.5 * sc;
  const duration = animate ? 400 : 0;
  
  // Fade out existing annotations
  const existing = layer.querySelectorAll('.annotation');
  existing.forEach(el => {
    el.style.transition = `opacity ${duration}ms ease-out`;
    el.style.opacity = '0';
  });
  
  // After fade out, replace with new annotations
  setTimeout(() => {
    layer.innerHTML = anns.map(a => {
      const w = Math.max(a.txt.length * fs * 0.6, 15 * sc);
      return `<g class="annotation ${a.t || ''}" transform="translate(${a.x},${a.y})" style="opacity: 0">
        <rect class="annotation-bg" x="${-w / 2}" y="${-fs*1.3}" width="${w}" height="${fs*2.6}" rx="${fs*0.4}"/>
        <text class="annotation-text" font-size="${fs}">${a.txt}</text>
      </g>`;
    }).join('');
    
    // Fade in new annotations
    requestAnimationFrame(() => {
      layer.querySelectorAll('.annotation').forEach(el => {
        el.style.transition = `opacity ${duration}ms ease-out`;
        el.style.opacity = '1';
      });
    });
  }, existing.length > 0 ? duration : 0);
}

// =============== PLAYBACK ===============
function updateCtrl() {
  const tot = S.seq.length, cur = S.step + 1;
  document.getElementById('stepInd').textContent = tot > 0 ? `${cur}/${tot}` : '-';
  document.getElementById('progress').style.width = tot > 0 ? `${(cur / tot) * 100}%` : '0%';
  document.getElementById('prevBtn').disabled = S.step <= 0;
  document.getElementById('nextBtn').disabled = S.step >= tot - 1;
  document.getElementById('playBtn').disabled = tot <= 1;
}
function prevStep() { if (S.step > 0) render(S.step - 1); }
function nextStep() { if (S.step < S.seq.length - 1) render(S.step + 1); }
function togglePlay() { S.playing ? stop() : start(); }
function start() {
  S.playing = true;
  document.getElementById('playIco').style.display = 'none';
  document.getElementById('pauseIco').style.display = 'block';
  const adv = () => {
    if (S.step < S.seq.length - 1) { render(S.step + 1); S.interval = setTimeout(adv, S.seq[S.step]?.dur || 2500); }
    else stop();
  };
  S.interval = setTimeout(adv, S.seq[S.step]?.dur || 2500);
}
function stop() {
  S.playing = false;
  document.getElementById('playIco').style.display = 'block';
  document.getElementById('pauseIco').style.display = 'none';
  clearTimeout(S.interval);
}
function seek(e) {
  const r = e.currentTarget.getBoundingClientRect();
  const p = (e.clientX - r.left) / r.width;
  const st = Math.floor(p * S.seq.length);
  render(Math.max(0, Math.min(st, S.seq.length - 1)));
}

function toggleLabels() {
  S.labels = !S.labels;
  document.getElementById('pitch').classList.toggle('show-labels', S.labels);
  document.getElementById('labelsBtn').classList.toggle('active', S.labels);
}
