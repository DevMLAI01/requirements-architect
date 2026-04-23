import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import anthropic from '@/lib/anthropic';
import { checkRateLimit } from '@/lib/rateLimit';
import type { ClarifyRequest, ClarifyResponse } from '@/lib/types';

const systemPrompt = readFileSync(
  join(process.cwd(), 'prompts', 'clarification_agent.txt'),
  'utf-8'
);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 requests per hour.' },
      { status: 429 }
    );
  }

  let body: ClarifyRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { description, projectType } = body;

  if (!description || typeof description !== 'string' || description.trim().length < 50) {
    return NextResponse.json(
      { error: 'Description must be at least 50 characters.' },
      { status: 400 }
    );
  }

  const userMessage = `Project type: ${projectType ?? 'custom'}\n\nProject description:\n${description.trim()}`;

  console.log(`[clarify] ip=${ip} remaining=${remaining} desc_len=${description.length}`);

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`[clarify] Anthropic API error: ${err.status} ${err.message}`);
      return NextResponse.json(
        { error: `Upstream API error: ${err.message}` },
        { status: err.status ?? 502 }
      );
    }
    throw err;
  }

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log(`[clarify] input_tokens=${response.usage.input_tokens} output_tokens=${response.usage.output_tokens}`);

  let questions: string[];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length < 3 || parsed.length > 5) {
      throw new Error('Expected array of 3–5 questions');
    }
    questions = parsed.map((q: unknown) => String(q));
  } catch {
    console.error('[clarify] Failed to parse questions JSON:', text);
    return NextResponse.json({ error: 'Failed to parse clarification questions.' }, { status: 500 });
  }

  return NextResponse.json<ClarifyResponse>({ questions });
}
