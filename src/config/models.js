// src/config/models.js
// Centralised provider config. Swap MODEL or add a new provider block
// without touching orchestration or prompt logic.

export const config = {
  provider: 'anthropic',
  model: process.env.MODEL || 'claude-sonnet-4-6',
  maxTokens: 700,
  apiKey: process.env.ANTHROPIC_API_KEY,
  apiUrl: 'https://api.anthropic.com/v1/messages',
};

export function assertConfigured() {
  if (!config.apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.'
    );
  }
}
