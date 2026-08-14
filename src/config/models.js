// src/config/models.js
// Centralised provider config. Swap MODEL or add a new provider block
// without touching orchestration or prompt logic.

export const config = {
  provider: 'gemini',
  model: process.env.MODEL || 'gemini-1.5-flash',
  maxTokens: 5000,
  apiKey: process.env.GEMINI_API_KEY,
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
};

export function assertConfigured() {
  if (!config.apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.'
    );
  }
}
