// src/orchestrator/llmClient.js
import { config, assertConfigured } from '../config/models.js';

export async function callLLM(systemPrompt, userPrompt) {
  assertConfigured();

  const url = `${config.apiUrl}/${config.model}:generateContent?key=${config.apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text:
              systemPrompt +
              ' Respond with ONLY a single JSON object, no markdown fences, no preamble, no commentary outside the JSON.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: config.maxTokens,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error('GEMINI CALL FAILED:', resp.status, text.slice(0, 500));
    throw new Error(`LLM API error ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('');

  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('GEMINI PARSE FAILED:', cleaned.slice(0, 500));
    throw new Error(`LLM returned unparsable JSON: ${cleaned.slice(0, 300)}`);
  }
}
