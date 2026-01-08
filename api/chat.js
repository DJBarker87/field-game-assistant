import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

// System prompt enhancement for diagram generation
const DIAGRAM_INSTRUCTIONS = `
When asked for a visual explanation, you MUST include a diagram in your response using JSON wrapped in <diagram> tags.

The diagram format is:
<diagram>
{
  "title": "Scenario Title",
  "description": "Brief description",
  "sequence": [
    {
      "step": 1,
      "caption": "What's happening",
      "duration": 2000,
      "camera": { "x": 55, "y": 37.5, "zoom": 1 },
      "ball": { "x": 55, "y": 37.5 },
      "attacking": {
        "key": { "x": 50, "y": 35, "role": "Post", "label": "B", "highlight": false, "sneaking": false }
      },
      "defending": { ... },
      "annotations": [{ "x": 55, "y": 20, "text": "Note", "type": "info|warning|scoring" }],
      "arrows": [{ "from": { "x": 50, "y": 35 }, "to": { "x": 60, "y": 40 }, "color": "#hex", "animated": true }],
      "zones": [{ "type": "sneaking|onTheLine|rougeable|bully", "x": 0, "y": 0, "width": 10, "height": 75 }]
    }
  ]
}
</diagram>

Pitch coordinates: X: 0 (attacking goal) to 110 (defending goal), Y: 0 (top) to 75 (bottom).
Goals at x=0 and x=110, centered at y=37.5. 3-yard lines at x=3 and x=107. 15-yard at x=15 and x=95.

Player labels: B (Bully), F (Fly), L (Long), S (Short), G (Goals/Goalkeeper)

For multi-step sequences, use camera zoom (1.5-2.5) for close-up action like on-the-line play.
`;

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

    if (!ASSISTANT_ID) {
      return res.status(500).json({ error: 'Assistant ID not configured' });
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
      ? `[VISUAL DIAGRAM REQUESTED] ${DIAGRAM_INSTRUCTIONS}\n\nUser question: ${message}`
      : message;

    // Add message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Poll for completion with timeout
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status === 'failed') {
      console.error('Run failed:', runStatus.last_error);
      throw new Error('Assistant run failed: ' + (runStatus.last_error?.message || 'Unknown error'));
    }

    if (attempts >= maxAttempts) {
      throw new Error('Request timed out');
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
              diagram = JSON.parse(diagramMatch[1].trim());
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
