// src/orchestrator/llmClient.js
// The one function that replaces what Claude Artifacts used to do for free:
// an authorized call to the Anthropic Messages API. Here it runs server-side,
// with the key held in an environment variable, never sent to the browser.

import { config, assertConfigured } from '../config/models.js';

export async function callLLM(systemPrompt, userPrompt) {
  assertConfigured();

  const resp = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      system:
        systemPrompt +
        ' Respond with ONLY a single JSON object, no markdown fences, no preamble, no commentary outside the JSON.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`LLM API error ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`LLM returned unparsable JSON: ${cleaned.slice(0, 300)}`);
  }
}
