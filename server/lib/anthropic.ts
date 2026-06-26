import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment. Create a .env file at the project root.');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model used for all agents. Update here to change globally.
export const MODEL = 'claude-sonnet-4-5' as const;
