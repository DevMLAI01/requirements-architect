import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import anthropic from '@/lib/anthropic';
import { checkRateLimit } from '@/lib/rateLimit';
import type { RefineRequest } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';

export const maxDuration = 60;

const systemPrompt = readFileSync(
  join(process.cwd(), 'prompts', 'architect_agent.txt'),
  'utf-8'
);

export async function POST(req: NextRequest): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Max 10 requests per hour.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: RefineRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { previousOutput, feedback } = body;

  if (!previousOutput || typeof previousOutput !== 'string' || previousOutput.trim().length < 100) {
    return new Response(
      JSON.stringify({ error: 'No document to refine.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 10) {
    return new Response(
      JSON.stringify({ error: 'Feedback must be at least 10 characters.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const userMessage = `Today's date: ${today}

You are revising an existing REQUIREMENTS.md based on user feedback. Apply the feedback precisely — update only what the feedback addresses and keep all other sections intact. The output must be the complete revised document.

--- EXISTING REQUIREMENTS.md ---

${previousOutput.trim()}

--- USER FEEDBACK ---

${feedback.trim()}

--- INSTRUCTION ---

Output the complete revised REQUIREMENTS.md now. Same structure, same sections, updated content where the feedback applies.`;

  console.log(`[refine] ip=${ip} remaining=${remaining} feedback_len=${feedback.length}`);

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 30_000);

  let stream: ReturnType<typeof anthropic.messages.stream>;
  try {
    stream = anthropic.messages.stream(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: abortController.signal }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Anthropic.APIError) {
      return new Response(JSON.stringify({ error: `Upstream API error: ${err.message}` }), {
        status: err.status ?? 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw err;
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        const finalMsg = await stream.finalMessage();
        console.log(
          `[refine] input_tokens=${finalMsg.usage.input_tokens} output_tokens=${finalMsg.usage.output_tokens} ` +
          `est_cost=$${((finalMsg.usage.input_tokens * 3 + finalMsg.usage.output_tokens * 15) / 1_000_000).toFixed(4)}`
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          controller.enqueue(
            new TextEncoder().encode(
              '\n\n---\n\n**Error: Refinement timed out after 30 seconds. Please try again.**'
            )
          );
        } else {
          controller.error(err);
        }
      } finally {
        clearTimeout(timeoutId);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Rate-Limit-Remaining': String(remaining),
    },
  });
}
