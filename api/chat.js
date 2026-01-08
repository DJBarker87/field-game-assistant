export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.OPENAI_API_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID || 'asst_WJOaxx60abw12Us2Wgk5U23n';

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { message, threadId, requestDiagram } = req.body;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'OpenAI-Beta': 'assistants=v2'
    };

    let currentThreadId = threadId;
    if (!currentThreadId) {
      const threadRes = await fetch('https://api.openai.com/v1/threads', { method: 'POST', headers });
      const thread = await threadRes.json();
      currentThreadId = thread.id;
    }

    // If diagram requested, append instruction to message
    let enhancedMessage = message;
    if (requestDiagram) {
      enhancedMessage += `

IMPORTANT: After your explanation, provide a JSON diagram specification in this exact format, wrapped in <diagram> tags:
<diagram>
{
  "title": "Brief title of the scenario",
  "phase": "open_play|bully|rouge|set_piece",
  "ball": {"x": 50, "y": 30, "moving": false, "trajectory": []},
  "players": [
    {"id": 1, "team": "attack", "role": "Fly", "x": 45, "y": 25, "moving": false, "trajectory": []},
    {"id": 2, "team": "defence", "role": "Behind", "x": 55, "y": 20, "moving": false, "trajectory": []}
  ],
  "annotations": [
    {"x": 50, "y": 15, "text": "Goal line"},
    {"x": 30, "y": 50, "text": "Ball is rougeable here", "arrow": {"from": [30, 50], "to": [50, 30]}}
  ],
  "zones": [
    {"type": "highlight", "x": 40, "y": 0, "width": 20, "height": 10, "label": "Rouge zone"}
  ],
  "sequence": [
    {"step": 1, "description": "Ball crosses goal line", "duration": 1000},
    {"step": 2, "description": "Attacker touches ball", "duration": 500}
  ]
}
</diagram>

Coordinates are percentages (0-100) where: x=0 is left sideline, x=100 is right sideline, y=0 is attacking goal line, y=100 is defending goal line. The 3-yard line is roughly y=5. Include trajectories as arrays of {x,y} points if showing movement.`;
    }

    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST', headers,
      body: JSON.stringify({ role: 'user', content: enhancedMessage })
    });

    const runRes = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST', headers,
      body: JSON.stringify({ assistant_id: ASSISTANT_ID, temperature: 0.3 })
    });
    const run = await runRes.json();

    let status = 'queued';
    while (status === 'queued' || status === 'in_progress') {
      await new Promise(r => setTimeout(r, 1000));
      const checkRes = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, { headers });
      const checkData = await checkRes.json();
      status = checkData.status;
    }

    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, { headers });
    const messagesData = await messagesRes.json();
    const assistantMessage = messagesData.data.find(m => m.role === 'assistant');
    let response = assistantMessage?.content[0]?.text?.value || 'No response';

    // Extract diagram if present
    let diagram = null;
    const diagramMatch = response.match(/<diagram>([\s\S]*?)<\/diagram>/);
    if (diagramMatch) {
      try {
        diagram = JSON.parse(diagramMatch[1].trim());
        response = response.replace(/<diagram>[\s\S]*?<\/diagram>/, '').trim();
      } catch (e) {
        console.error('Failed to parse diagram:', e);
      }
    }

    res.json({ response, threadId: currentThreadId, diagram });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
