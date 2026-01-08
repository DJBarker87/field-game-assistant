import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Field Game pitch dimensions (in yards, scaled for SVG)
const PITCH = {
  width: 110,  // yards
  height: 75,  // yards
  goalWidth: 12,
  threeYardLine: 3,
  fifteenYardLine: 15,
  tramlineOffset: 18.75, // Half-way between center and touchline
};

// Default player positions for 11-a-side Field Game
const DEFAULT_POSITIONS = {
  attacking: {
    // Bully players (7)
    post: { x: 55, y: 37.5, role: 'Post', number: 1 },
    sidePostL: { x: 53, y: 35, role: 'Side Post', number: 2 },
    sidePostR: { x: 53, y: 40, role: 'Side Post', number: 3 },
    cornerL: { x: 51, y: 32, role: 'Corner', number: 4 },
    cornerR: { x: 51, y: 43, role: 'Corner', number: 5 },
    cornerFarL: { x: 49, y: 30, role: 'Corner', number: 6 },
    bup: { x: 52, y: 37.5, role: 'Bup', number: 7 },
    // Fly (1)
    fly: { x: 45, y: 37.5, role: 'Fly', number: 8 },
    // Behinds (3)
    shortBehind: { x: 35, y: 37.5, role: 'Short', number: 9 },
    longBehindL: { x: 20, y: 25, role: 'Long', number: 10 },
    longBehindR: { x: 20, y: 50, role: 'Long', number: 11 },
  },
  defending: {
    post: { x: 57, y: 37.5, role: 'Post', number: 1 },
    sidePostL: { x: 59, y: 35, role: 'Side Post', number: 2 },
    sidePostR: { x: 59, y: 40, role: 'Side Post', number: 3 },
    cornerL: { x: 61, y: 32, role: 'Corner', number: 4 },
    cornerR: { x: 61, y: 43, role: 'Corner', number: 5 },
    cornerFarL: { x: 63, y: 30, role: 'Corner', number: 6 },
    bup: { x: 60, y: 37.5, role: 'Bup', number: 7 },
    fly: { x: 67, y: 37.5, role: 'Fly', number: 8 },
    shortBehind: { x: 77, y: 37.5, role: 'Short', number: 9 },
    longBehindL: { x: 92, y: 25, role: 'Long', number: 10 },
    longBehindR: { x: 92, y: 50, role: 'Long', number: 11 },
  }
};

// Preprepared scenarios based on Field Game laws
const SCENARIOS = {
  kickoff: {
    name: "Kick-off / Set-Piece Bully at Centre",
    description: "Starting formation for a Set-Piece Bully at the centre of the pitch. The team that lost the toss has 'Heads' (crouched position).",
    ball: { x: 55, y: 37.5 },
    attacking: DEFAULT_POSITIONS.attacking,
    defending: DEFAULT_POSITIONS.defending,
    annotations: [
      { x: 55, y: 20, text: "Ball inserted by Corner without Heads" },
      { x: 55, y: 55, text: "Team with Heads crouches on 'CROUCH'" }
    ],
    zones: [
      { type: 'bully', x: 50, y: 30, width: 12, height: 15, label: 'Tightly-Formed Bully' }
    ]
  },
  
  sneakingBehind: {
    name: "Sneaking - Behind Running with Ball",
    description: "When a Behind is 'making ground running-with-the-ball', any player with both feet fully in front of the ball is Sneaking.",
    ball: { x: 40, y: 45 },
    attacking: {
      ...DEFAULT_POSITIONS.attacking,
      shortBehind: { x: 40, y: 45, role: 'Short (with ball)', number: 9, highlight: true },
      fly: { x: 50, y: 40, role: 'Fly (SNEAKING!)', number: 8, sneaking: true },
    },
    defending: DEFAULT_POSITIONS.defending,
    annotations: [
      { x: 50, y: 35, text: "Fly is SNEAKING - in front of Behind with ball", type: 'warning' },
      { x: 40, y: 50, text: "Behind making ground running-with-the-ball" }
    ],
    arrows: [
      { from: { x: 40, y: 45 }, to: { x: 50, y: 45 }, color: '#ff6b6b', label: 'Direction of play' }
    ],
    zones: [
      { type: 'sneaking', x: 41, y: 0, width: 69, height: 75, label: 'Sneaking Zone' }
    ]
  },
  
  sneakingKick: {
    name: "Sneaking - After Behind's Kick",
    description: "After a Behind kicks, a player is Sneaking if in front of BOTH all opposition Bully-players AND the ball (unless in possession).",
    ball: { x: 70, y: 37.5 },
    attacking: {
      ...DEFAULT_POSITIONS.attacking,
      longBehindL: { x: 25, y: 30, role: 'Long (kicked)', number: 10 },
      fly: { x: 75, y: 35, role: 'Fly (SNEAKING!)', number: 8, sneaking: true },
    },
    defending: {
      ...DEFAULT_POSITIONS.defending,
      post: { x: 72, y: 37.5, role: 'Post', number: 1 },
    },
    annotations: [
      { x: 75, y: 30, text: "Fly is in front of ball AND all defending Bully players", type: 'warning' }
    ],
    arrows: [
      { from: { x: 25, y: 30 }, to: { x: 70, y: 37.5 }, color: '#4ecdc4', label: 'Kick trajectory', dashed: true }
    ]
  },
  
  cornering: {
    name: "Cornering - Failing to Track Ball",
    description: "Players must track the lateral movement of the ball. A player who fails to do so is in a Cornering position.",
    ball: { x: 60, y: 55 },
    attacking: {
      ...DEFAULT_POSITIONS.attacking,
      fly: { x: 55, y: 25, role: 'Fly (CORNERING!)', number: 8, cornering: true },
    },
    defending: DEFAULT_POSITIONS.defending,
    annotations: [
      { x: 55, y: 20, text: "Fly has not tracked lateral ball movement", type: 'warning' },
      { x: 60, y: 60, text: "Ball has moved laterally" }
    ],
    arrows: [
      { from: { x: 55, y: 37.5 }, to: { x: 60, y: 55 }, color: '#4ecdc4', label: 'Ball movement', dashed: true },
      { from: { x: 55, y: 37.5 }, to: { x: 55, y: 25 }, color: '#ff6b6b', label: 'Fly stayed wide' }
    ]
  },
  
  onTheLine: {
    name: "On-the-Line Play",
    description: "When the ball is between the goal-line and 3-yard line under attacker control. Defenders must engage constantly.",
    ball: { x: 2, y: 40 },
    attacking: {
      shortBehind: { x: 2, y: 40, role: 'Attacker on line', number: 9, highlight: true },
      fly: { x: 10, y: 37.5, role: 'Fly', number: 8 },
      longBehindL: { x: 20, y: 25, role: 'Long', number: 10 },
      longBehindR: { x: 20, y: 50, role: 'Long', number: 11 },
      post: { x: 15, y: 35, role: 'Post', number: 1 },
      sidePostL: { x: 15, y: 32, role: 'Side Post', number: 2 },
      sidePostR: { x: 15, y: 43, role: 'Side Post', number: 3 },
      cornerL: { x: 17, y: 30, role: 'Corner', number: 4 },
      cornerR: { x: 17, y: 45, role: 'Corner', number: 5 },
      cornerFarL: { x: 19, y: 28, role: 'Corner', number: 6 },
      bup: { x: 16, y: 37.5, role: 'Bup', number: 7 },
    },
    defending: {
      shortBehind: { x: 2, y: 42, role: 'Defender engaging', number: 9, highlight: true },
      fly: { x: 5, y: 37.5, role: 'Fly', number: 8 },
      longBehindL: { x: 1, y: 33, role: 'Goals', number: 10 },
      longBehindR: { x: 1, y: 42, role: 'Long', number: 11 },
      post: { x: 8, y: 35, role: 'Post', number: 1 },
      sidePostL: { x: 8, y: 32, role: 'Side Post', number: 2 },
      sidePostR: { x: 8, y: 43, role: 'Side Post', number: 3 },
      cornerL: { x: 10, y: 30, role: 'Corner', number: 4 },
      cornerR: { x: 10, y: 45, role: 'Corner', number: 5 },
      cornerFarL: { x: 12, y: 28, role: 'Corner', number: 6 },
      bup: { x: 9, y: 37.5, role: 'Bup', number: 7 },
    },
    annotations: [
      { x: 2, y: 55, text: "Attacker must keep ball moving" },
      { x: 2, y: 60, text: "Defender must constantly engage" }
    ],
    zones: [
      { type: 'onTheLine', x: 0, y: 0, width: 3, height: 75, label: '3-yard zone' }
    ],
    arrows: [
      { from: { x: 2, y: 40 }, to: { x: 0, y: 40 }, color: '#96c8a2', label: 'Towards goal' }
    ]
  },
  
  rougeableBall: {
    name: "Rougeable Ball Situation",
    description: "Ball crossing goal-line (extended infinitely) after last touch by defender. First hand touch determines outcome.",
    ball: { x: -2, y: 45 },
    attacking: {
      shortBehind: { x: 1, y: 43, role: 'Attacker reaching', number: 9, highlight: true },
      fly: { x: 5, y: 40, role: 'Fly', number: 8 },
      longBehindL: { x: 15, y: 30, role: 'Long', number: 10 },
      longBehindR: { x: 15, y: 55, role: 'Long', number: 11 },
    },
    defending: {
      shortBehind: { x: 0, y: 47, role: 'Defender reaching', number: 9, highlight: true },
      fly: { x: 3, y: 35, role: 'Fly', number: 8 },
      longBehindL: { x: 1, y: 33, role: 'Goals', number: 10 },
    },
    annotations: [
      { x: -5, y: 40, text: "ROUGEABLE - Ball behind goal-line", type: 'scoring' },
      { x: 5, y: 55, text: "First hand touch determines outcome" }
    ],
    zones: [
      { type: 'rougeable', x: -15, y: 0, width: 15, height: 75, label: 'Behind (Rougeable zone)' }
    ],
    arrows: [
      { from: { x: 5, y: 45 }, to: { x: -2, y: 45 }, color: '#ff6b6b', label: 'Ball path', dashed: true }
    ]
  },
  
  conversion: {
    name: "Conversion Attempt",
    description: "After scoring a Rouge, attacking team attempts to score a Conversion by going along the 3-yard line.",
    ball: { x: 3, y: 18.75 },
    attacking: {
      shortBehind: { x: 3, y: 18.75, role: 'Attacker (conversion)', number: 9, highlight: true },
      fly: { x: 10, y: 20, role: 'Fly', number: 8 },
      longBehindL: { x: 20, y: 15, role: 'Long', number: 10 },
      longBehindR: { x: 20, y: 25, role: 'Long', number: 11 },
    },
    defending: {
      shortBehind: { x: 6, y: 20, role: 'Defender (3yds back)', number: 9 },
      fly: { x: 8, y: 25, role: 'Fly', number: 8 },
      longBehindL: { x: 1, y: 33, role: 'Goals', number: 10 },
      longBehindR: { x: 1, y: 42, role: 'Long', number: 11 },
    },
    annotations: [
      { x: 3, y: 12, text: "Ball starts at tramline/3-yard intersection" },
      { x: 6, y: 28, text: "Defenders must start 3 yards from ball" }
    ],
    zones: [
      { type: 'onTheLine', x: 0, y: 0, width: 3, height: 75, label: '3-yard line' }
    ],
    arrows: [
      { from: { x: 3, y: 18.75 }, to: { x: 3, y: 56.25 }, color: '#96c8a2', label: 'Conversion path' }
    ]
  },
  
  bullyRush: {
    name: "Bully-Rush Formation",
    description: "A Tightly-Formed Bully that has formed in open play (not a Set-Piece). Two or more players from each side in close contact.",
    ball: { x: 45, y: 50 },
    attacking: {
      post: { x: 45, y: 50, role: 'Post', number: 1, highlight: true },
      sidePostL: { x: 43, y: 48, role: 'Side Post', number: 2 },
      sidePostR: { x: 43, y: 52, role: 'Side Post', number: 3 },
      cornerL: { x: 41, y: 46, role: 'Corner', number: 4 },
      cornerR: { x: 41, y: 54, role: 'Corner', number: 5 },
      fly: { x: 38, y: 50, role: 'Fly (behind bully)', number: 8 },
      shortBehind: { x: 30, y: 50, role: 'Short', number: 9 },
      longBehindL: { x: 20, y: 35, role: 'Long', number: 10 },
      longBehindR: { x: 20, y: 65, role: 'Long', number: 11 },
    },
    defending: {
      post: { x: 47, y: 50, role: 'Post', number: 1, highlight: true },
      sidePostL: { x: 49, y: 48, role: 'Side Post', number: 2 },
      sidePostR: { x: 49, y: 52, role: 'Side Post', number: 3 },
      cornerL: { x: 51, y: 46, role: 'Corner', number: 4 },
      cornerR: { x: 51, y: 54, role: 'Corner', number: 5 },
      fly: { x: 54, y: 50, role: 'Fly', number: 8 },
      shortBehind: { x: 65, y: 50, role: 'Short', number: 9 },
      longBehindL: { x: 85, y: 35, role: 'Long', number: 10 },
      longBehindR: { x: 85, y: 65, role: 'Long', number: 11 },
    },
    annotations: [
      { x: 46, y: 40, text: "Bully-Rush formed in open play" },
      { x: 38, y: 55, text: "Fly must stay behind centre of bully" }
    ],
    zones: [
      { type: 'bully', x: 40, y: 44, width: 14, height: 12, label: 'Tightly-Formed Bully' }
    ]
  },
  
  freeKick: {
    name: "Free Kick Situation",
    description: "After an infringement, the non-offending team takes a Free-Kick. Opposition must be 10 yards away.",
    ball: { x: 40, y: 37.5 },
    attacking: {
      shortBehind: { x: 40, y: 37.5, role: 'Kicker', number: 9, highlight: true },
      fly: { x: 45, y: 40, role: 'Fly', number: 8 },
      longBehindL: { x: 35, y: 25, role: 'Long', number: 10 },
      longBehindR: { x: 35, y: 50, role: 'Long', number: 11 },
      post: { x: 48, y: 35, role: 'Post', number: 1 },
    },
    defending: {
      shortBehind: { x: 50, y: 37.5, role: 'Short (10yds)', number: 9 },
      fly: { x: 52, y: 40, role: 'Fly', number: 8 },
      post: { x: 54, y: 35, role: 'Post', number: 1 },
      longBehindL: { x: 75, y: 30, role: 'Long', number: 10 },
      longBehindR: { x: 75, y: 45, role: 'Long', number: 11 },
    },
    annotations: [
      { x: 40, y: 30, text: "Ball must be stationary" },
      { x: 50, y: 45, text: "Defenders 10 yards minimum" }
    ],
    zones: [
      { type: 'exclusion', x: 30, y: 27.5, width: 20, height: 20, radius: 10, label: '10-yard exclusion' }
    ]
  },
  
  passingBack: {
    name: "Passing Back Infringement",
    description: "Ball travels backwards to teammate after deliberate forward attempt. Re-start from where ball was initially played.",
    ball: { x: 35, y: 40 },
    attacking: {
      shortBehind: { x: 45, y: 35, role: 'Original kicker', number: 9 },
      longBehindL: { x: 35, y: 40, role: 'Receiver (PASSING BACK!)', number: 10, highlight: true },
      fly: { x: 50, y: 37.5, role: 'Fly', number: 8 },
    },
    defending: DEFAULT_POSITIONS.defending,
    annotations: [
      { x: 45, y: 30, text: "Kick intended to go forward", type: 'info' },
      { x: 35, y: 45, text: "Ball went backwards - PASSING BACK", type: 'warning' },
      { x: 45, y: 50, text: "Set-Piece Bully from original kick position" }
    ],
    arrows: [
      { from: { x: 45, y: 35 }, to: { x: 55, y: 35 }, color: '#4ecdc4', label: 'Intended', dashed: true },
      { from: { x: 45, y: 35 }, to: { x: 35, y: 40 }, color: '#ff6b6b', label: 'Actual path' }
    ]
  },
  
  sneakingOnLine: {
    name: "Sneaking-on-the-Line",
    description: "Special Sneaking rules when ball is going along the line. Different rules for attackers and defenders.",
    ball: { x: 2, y: 35 },
    attacking: {
      shortBehind: { x: 2, y: 35, role: 'On line', number: 9, highlight: true },
      fly: { x: 8, y: 30, role: 'Fly (valid)', number: 8 },
      longBehindL: { x: 16, y: 25, role: 'Long (outside 15yd)', number: 10 },
      post: { x: 10, y: 40, role: 'Post (SNEAKING!)', number: 1, sneaking: true },
    },
    defending: {
      shortBehind: { x: 2, y: 38, role: 'Engaging', number: 9 },
      fly: { x: 5, y: 25, role: 'Fly (SNEAKING!)', number: 8, sneaking: true },
      longBehindL: { x: 1, y: 33, role: 'Goals', number: 10 },
    },
    annotations: [
      { x: 10, y: 45, text: "Attacker further from touchline = SNEAKING", type: 'warning' },
      { x: 5, y: 20, text: "Defender nearer touchline = SNEAKING", type: 'warning' }
    ],
    zones: [
      { type: 'onTheLine', x: 0, y: 0, width: 3, height: 75, label: '3-yard zone' }
    ]
  },
  
  goalKick: {
    name: "Goal Kick",
    description: "Taken by defender from any point on or within the 3-yard line, within the tramlines, after ball is 'cooled over'.",
    ball: { x: 2, y: 37.5 },
    attacking: {
      ...DEFAULT_POSITIONS.attacking,
      post: { x: 20, y: 35, role: 'Post', number: 1 },
      fly: { x: 15, y: 37.5, role: 'Fly', number: 8 },
    },
    defending: {
      shortBehind: { x: 2, y: 37.5, role: 'Kicker', number: 9, highlight: true },
      fly: { x: 10, y: 40, role: 'Fly', number: 8 },
      longBehindL: { x: 1, y: 33, role: 'Goals', number: 10 },
      longBehindR: { x: 1, y: 42, role: 'Long', number: 11 },
      post: { x: 25, y: 37.5, role: 'Post', number: 1 },
    },
    annotations: [
      { x: 2, y: 50, text: "Goal kick within 3-yard line and tramlines" },
    ],
    zones: [
      { type: 'goalKick', x: 0, y: 18.75, width: 3, height: 37.5, label: 'Goal kick zone' }
    ]
  }
};

// System prompt with Field Game expertise and diagram instructions
const SYSTEM_PROMPT = `You are Ralph, an expert Field Game assistant at Eton College. You have deep knowledge of the Laws of the Field Game (revised January 2025) and can explain rules, tactics, and scenarios with clarity and authority.

Your personality:
- Knowledgeable and authoritative about Field Game
- Patient and clear in explanations
- Use proper Field Game terminology (Bully, Sneaking, Cornering, Rouge, etc.)
- Occasionally reference the unique traditions of Eton

When the user asks for a visual explanation or uses the "Diagram" button, you MUST include a diagram in your response using the following JSON format wrapped in <diagram> tags:

<diagram>
{
  "title": "Scenario Title",
  "description": "Brief description of what's being shown",
  "sequence": [
    {
      "step": 1,
      "caption": "What's happening in this frame",
      "ball": { "x": 55, "y": 37.5 },
      "attacking": {
        "playerKey": { "x": 50, "y": 35, "role": "Role Name", "number": 1, "highlight": false, "sneaking": false, "cornering": false }
      },
      "defending": {
        "playerKey": { "x": 60, "y": 40, "role": "Role Name", "number": 1 }
      },
      "annotations": [
        { "x": 55, "y": 20, "text": "Annotation text", "type": "info|warning|scoring" }
      ],
      "arrows": [
        { "from": { "x": 50, "y": 35 }, "to": { "x": 60, "y": 40 }, "color": "#hex", "label": "Label", "dashed": false }
      ],
      "zones": [
        { "type": "sneaking|cornering|onTheLine|bully|rougeable|exclusion|goalKick", "x": 0, "y": 0, "width": 10, "height": 75, "label": "Zone label" }
      ]
    }
  ]
}
</diagram>

Pitch coordinates:
- X: 0 (left/attacking goal) to 110 (right/defending goal)
- Y: 0 (top touchline) to 75 (bottom touchline)
- Goals are at x=0 and x=110, centered at y=37.5
- 3-yard lines at x=3 and x=107
- 15-yard lines at x=15 and x=95
- Tramlines at y≈18.75 and y≈56.25

Player roles for 11-a-side:
- Bully (7): Post, Side Post (x2), Corner (x3), Bup
- Fly (1)
- Behinds (3): Short, Long (x2)

Available preprepared scenarios you can reference:
${Object.entries(SCENARIOS).map(([key, scenario]) => `- ${key}: ${scenario.name}`).join('\n')}

Key Field Game concepts to explain visually:
1. SNEAKING: Being in front of player running-with-ball, or in front of all opposition Bully + ball after kick
2. CORNERING: Failing to track lateral ball movement
3. ON-THE-LINE: Ball between goal-line and 3-yard line under attacker control
4. ROUGE: Ball crossing goal-line (extended infinitely) after defender touch
5. TIGHTLY-FORMED BULLY: 2+ players from each side in close contact
6. PASSING BACK: Ball going backwards after deliberate forward attempt

When creating sequences, show the progression of play with multiple steps to illustrate the rule clearly.`;

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, threadId, requestDiagram } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create assistant
    let assistantId = process.env.OPENAI_ASSISTANT_ID;
    
    if (!assistantId) {
      const assistant = await openai.beta.assistants.create({
        name: "Ralph - Field Game Expert",
        instructions: SYSTEM_PROMPT,
        model: "gpt-4-turbo-preview",
      });
      assistantId = assistant.id;
    }

    // Get or create thread
    let thread;
    if (threadId) {
      thread = { id: threadId };
    } else {
      thread = await openai.beta.threads.create();
    }

    // Modify message if diagram requested
    const userMessage = requestDiagram 
      ? `[DIAGRAM REQUESTED] Please provide a visual diagram explanation for: ${message}`
      : message;

    // Add message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'failed') {
      throw new Error('Assistant run failed');
    }

    // Get messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(m => m.role === 'assistant');
    
    let responseText = '';
    let diagram = null;

    if (assistantMessage && assistantMessage.content) {
      for (const content of assistantMessage.content) {
        if (content.type === 'text') {
          responseText = content.text.value;
          
          // Extract diagram JSON if present
          const diagramMatch = responseText.match(/<diagram>([\s\S]*?)<\/diagram>/);
          if (diagramMatch) {
            try {
              diagram = JSON.parse(diagramMatch[1]);
              // Remove diagram from text response
              responseText = responseText.replace(/<diagram>[\s\S]*?<\/diagram>/, '').trim();
            } catch (e) {
              console.error('Failed to parse diagram JSON:', e);
            }
          }
        }
      }
    }

    return res.status(200).json({
      response: responseText,
      diagram: diagram,
      threadId: thread.id,
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'An error occurred processing your request',
      details: error.message 
    });
  }
}

// Export scenarios for potential direct access
export { SCENARIOS, DEFAULT_POSITIONS, PITCH };
