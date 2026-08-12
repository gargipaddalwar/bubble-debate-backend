// src/orchestrator/llmClient.js
// The one function that replaces what Claude Artifacts used to do for free:
// an authorized call to the Gemini API. Here it runs server-side,
// with the key held in an environment variable, never sent to the browser.
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
      },
    }),
  });

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
