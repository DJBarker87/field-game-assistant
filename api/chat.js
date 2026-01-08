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
    const { message, threadId } = req.body;
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

    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST', headers,
      body: JSON.stringify({ role: 'user', content: message })
    });

    const runRes = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
  method: 'POST', headers,
  body: JSON.stringify({ assistant_id: ASSISTANT_ID, temperature: 0.4 })
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
    res.json({ response: assistantMessage?.content[0]?.text?.value || 'No response', threadId: currentThreadId });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
