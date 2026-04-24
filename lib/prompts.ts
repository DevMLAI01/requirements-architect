import { readFileSync } from 'fs';
import { join } from 'path';
import type { ProjectType } from './types';

const architectPrompt = readFileSync(
  join(process.cwd(), 'prompts', 'architect_agent.txt'),
  'utf-8'
);

export function buildArchitectPrompt(
  description: string,
  answers: string[],
  projectType: ProjectType,
  templateContext: string | null
): { system: string; userMessage: string } {
  const answersBlock =
    answers.length > 0
      ? answers.map((a, i) => `Answer ${i + 1}: ${a}`).join('\n')
      : '(No clarification answers provided)';

  const templateBlock = templateContext
    ? `\n\n---\n\n${templateContext}\n\n---`
    : '';

  const today = new Date().toISOString().split('T')[0];

  const userMessage = `Today's date: ${today}
Project type: ${projectType}

Project description:
${description.trim()}

Clarification answers:
${answersBlock}${templateBlock}

Generate the complete REQUIREMENTS.md now.`;

  const estimatedTokens = Math.ceil((architectPrompt.length + userMessage.length) / 4);
  if (estimatedTokens > 4000) {
    console.warn(
      `[generate] Assembled prompt ~${estimatedTokens} tokens (exceeds 4000 token warning threshold)`
    );
  }
  console.log(`[generate] Prompt estimate: ~${estimatedTokens} tokens, template: ${projectType}`);

  return { system: architectPrompt, userMessage };
}
