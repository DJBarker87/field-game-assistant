// Vercel Serverless Function (Node.js runtime)
// Uses raw fetch to OpenAI Assistants API v2

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  // Debug logging - check Vercel function logs
  console.log('=== Field Game Assistant API ===');
  console.log('OPENAI_API_KEY set:', !!OPENAI_API_KEY);
  console.log('ASSISTANT_ID:', ASSISTANT_ID || 'NOT SET');
  
  // Validate Assistant ID format
  if (ASSISTANT_ID && !ASSISTANT_ID.startsWith('asst_')) {
    console.error('WARNING: ASSISTANT_ID does not start with asst_');
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  if (!ASSISTANT_ID) {
    return res.status(500).json({ error: 'Assistant ID not configured' });
  }

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  };

  try {
    const { message, threadId, requestDiagram } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if user is asking for a diagram (either via button or in their message)
    const wantsDiagram = requestDiagram || 
      /diagram|visual|show me|illustrat/i.test(message);
    
    // If they want a diagram, append a reminder to the message
    let finalMessage = message;
    if (wantsDiagram) {
      finalMessage = message + '\n\n[SYSTEM: The user has requested a visual diagram. You MUST include a <diagram> JSON block in your response following the format in your instructions. Do not skip this.]';
    }

    console.log('Message received:', message.substring(0, 50) + '...');
    console.log('Wants diagram:', wantsDiagram);
    console.log('Thread ID:', threadId || 'NEW');

    // Step 1: Get or create thread
    let thread;
    if (threadId) {
      thread = { id: threadId };
      console.log('Using existing thread:', threadId);
    } else {
      console.log('Creating new thread...');
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      
      if (!threadRes.ok) {
        const err = await threadRes.text();
        console.error('Thread creation failed:', err);
        throw new Error(`Failed to create thread: ${err}`);
      }
      
      thread = await threadRes.json();
      console.log('Created thread:', thread.id);
    }

    // Step 2: Add message to thread
    console.log('Adding message to thread...');
    const msgRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        role: 'user',
        content: finalMessage
      })
    });

    if (!msgRes.ok) {
      const err = await msgRes.text();
      console.error('Message creation failed:', err);
      throw new Error(`Failed to add message: ${err}`);
    }
    
    console.log('Message added successfully');

    // Step 3: Run the assistant
    console.log('Starting assistant run with ID:', ASSISTANT_ID);
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        temperature: 0.4
      })
    });

    if (!runRes.ok) {
      const err = await runRes.text();
      console.error('Run creation failed:', err);
      throw new Error(`Failed to start run: ${err}`);
    }

    const run = await runRes.json();
    console.log('Run started:', run.id, 'Status:', run.status);

    // Step 4: Poll for completion
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 60;

    while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && runStatus.status !== 'cancelled' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        method: 'GET',
        headers
      });

      if (!statusRes.ok) {
        const err = await statusRes.text();
        console.error('Status check failed:', err);
        throw new Error(`Failed to check run status: ${err}`);
      }

      runStatus = await statusRes.json();
      attempts++;
      
      if (attempts % 5 === 0) {
        console.log(`Polling attempt ${attempts}, status: ${runStatus.status}`);
      }
    }

    console.log('Final run status:', runStatus.status);

    if (runStatus.status === 'failed') {
      console.error('Run failed:', runStatus.last_error);
      throw new Error('Assistant run failed: ' + (runStatus.last_error?.message || 'Unknown error'));
    }

    if (runStatus.status === 'cancelled') {
      throw new Error('Assistant run was cancelled');
    }

    if (attempts >= maxAttempts) {
      throw new Error('Request timed out after 60 seconds');
    }

    // Step 5: Get messages
    console.log('Fetching messages...');
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages?limit=10`, {
      method: 'GET',
      headers
    });

    if (!messagesRes.ok) {
      const err = await messagesRes.text();
      console.error('Messages fetch failed:', err);
      throw new Error(`Failed to get messages: ${err}`);
    }

    const messages = await messagesRes.json();
    
    // Find the latest assistant message
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
              responseText = responseText.replace(/<diagram>[\s\S]*?<\/diagram>/, '').trim();
            } catch (e) {
              console.error('Failed to parse diagram JSON:', e);
            }
          }
        }
      }
    }

    console.log('Response length:', responseText.length);
    console.log('Has diagram:', !!diagram);

    return res.status(200).json({
      response: responseText,
      diagram: diagram,
      threadId: thread.id
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'An error occurred processing your request',
      details: error.message
    });
  }
}
