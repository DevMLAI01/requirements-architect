# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Framework**: Next.js 16.2 (App Router, TypeScript strict mode)
- **Styling**: Tailwind CSS v4
- **LLM**: `claude-sonnet-4-6` via `@anthropic-ai/sdk ^0.90.0`
- **Markdown rendering**: `react-markdown` + `rehype-highlight`
- **Deployment**: Vercel (serverless — `export const maxDuration = 60` on generate route)
- **No database** — rate-limit store is in-process `Map`, resets on cold start

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (runs tsc + Next.js compile)
npm run start    # Serve production build locally
```

No test runner is configured. Verify changes with `npm run build` and manual smoke-testing.

## Architecture

### Wizard flow

The UI is a single-page state machine in `app/page.tsx` driven by `hooks/useRequirementsGenerator.ts` (`useReducer`):

```
idle → clarifying → answering → generating → done
                                           → error (retryable via lastGenParams ref)
```

The hook owns all async logic. Components are purely presentational.

### Two-agent pipeline

1. **Clarification Agent** (`/api/clarify`) — blocking POST, returns `{ questions: string[] }` (3–5 items). Reads system prompt from `prompts/clarification_agent.txt` at request time via `readFileSync`. Max 512 output tokens.

2. **Architect Agent** (`/api/generate`) — streaming POST, returns `text/plain` chunks. `buildArchitectPrompt()` in `lib/prompts.ts` reads `prompts/architect_agent.txt` once at module load, then assembles the user message with description + answers + optional template context. Max 3000 output tokens.

### Template system

`lib/templates/index.ts` exports `formatTemplateContext(projectType)` which loads one of five JSON files (`aiops_triage`, `data_lakehouse`, `rag_agent`, `llm_eval`, `job_pipeline`) and formats it as a markdown block injected into the architect prompt. Returns `null` for `custom` type. Adding a new template requires a new JSON file and a case in `formatTemplateContext`.

### Rate limiting

`lib/rateLimit.ts` — in-process sliding window, 10 req/IP/hour. Applied in both API routes before any Anthropic call. **Caveat**: resets on Vercel function cold start; not shared across instances.

### Streaming pattern

`/api/generate` wraps `anthropic.messages.stream()` in a `ReadableStream`, iterating `content_block_delta` events and piping `text_delta` chunks to the response. A 30s `AbortController` timeout streams a user-facing error message inline rather than closing the connection with an error code.

## Conventions

- System prompts live in `/prompts/*.txt` — never inline in TypeScript
- All Anthropic calls go through `/api/*` routes — never from client components
- `shadcn/ui` components: `npx shadcn-ui@latest add <component>` (no `any`, strict TS)
- Token cost logging on every generation: `input * $3 + output * $15` per million

## Do not

- Inline system prompts in TypeScript — read from `/prompts/*.txt`
- Stream the Clarification Agent response — blocking JSON parse is required
- Call Architect Agent without answers from Clarification Agent in the same session
- Use `dangerouslySetInnerHTML` for markdown output
- Commit `.env.local`
