import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import anthropic from '@/lib/anthropic';
import { checkRateLimit } from '@/lib/rateLimit';
import { buildArchitectPrompt } from '@/lib/prompts';
import { formatTemplateContext } from '@/lib/templates/index';
import type { GenerateRequest } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Max 10 requests per hour.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { description, projectType, answers } = body;

  if (!description || typeof description !== 'string' || description.trim().length < 50) {
    return new Response(
      JSON.stringify({ error: 'Description must be at least 50 characters.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Answers are required. Run the clarification step first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const templateContext = formatTemplateContext(projectType);
  const { system, userMessage } = buildArchitectPrompt(description, answers, projectType, templateContext);

  console.log(`[generate] ip=${ip} remaining=${remaining} projectType=${projectType}`);

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 30_000);

  let stream: ReturnType<typeof anthropic.messages.stream>;
  try {
    stream = anthropic.messages.stream(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: abortController.signal }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Anthropic.APIError) {
      console.error(`[generate] Anthropic API error: ${err.status} ${err.message}`);
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
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        const finalMsg = await stream.finalMessage();
        console.log(
          `[generate] input_tokens=${finalMsg.usage.input_tokens} output_tokens=${finalMsg.usage.output_tokens} ` +
          `est_cost=$${((finalMsg.usage.input_tokens * 3 + finalMsg.usage.output_tokens * 15) / 1_000_000).toFixed(4)}`
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.error('[generate] Request timed out after 30s');
          controller.enqueue(
            new TextEncoder().encode(
              '\n\n---\n\n**Error: Generation timed out after 30 seconds. Please try again.**'
            )
          );
        } else {
          console.error('[generate] Stream error:', err);
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
