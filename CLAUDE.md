# CLAUDE.md
## REQUIREMENTS Architect — Claude Code Session Context

## Stack
- Framework: Next.js 14 (App Router, TypeScript)
- Styling: Tailwind CSS, shadcn/ui
- Markdown: react-markdown, rehype-highlight
- LLM: claude-sonnet-4-6 (both agents) via anthropic npm SDK ^0.24.0
- Deployment: Vercel (free tier, serverless functions)
- No database — fully stateless

## Project structure
```
requirements-architect/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
│       ├── clarify/route.ts      # Clarification Agent — returns { questions[] }
│       └── generate/route.ts     # Architect Agent — streaming markdown
├── components/
│   ├── DescriptionInput.tsx
│   ├── ClarificationForm.tsx
│   ├── MarkdownRenderer.tsx
│   └── GenerationStats.tsx
├── lib/
│   ├── anthropic.ts
│   ├── prompts.ts                # buildArchitectPrompt()
│   ├── types.ts
│   └── templates/
│       ├── aiops_triage.json
│       ├── data_lakehouse.json
│       ├── rag_agent.json
│       ├── llm_eval.json
│       └── job_pipeline.json
├── prompts/
│   ├── clarification_agent.txt
│   └── architect_agent.txt
├── hooks/
│   └── useRequirementsGenerator.ts
├── .env.local                    # ANTHROPIC_API_KEY only — never commit
├── CLAUDE.md                     # This file
└── REQUIREMENTS.md
```

## Conventions
- System prompts live in `/prompts/*.txt` — never inline in TypeScript
- `buildArchitectPrompt()` in `/lib/prompts.ts` assembles the final prompt at runtime
- Streaming uses Next.js `ReadableStream` + Anthropic `stream: true` pattern
- shadcn components via `npx shadcn-ui@latest add <component>` only
- TypeScript strict mode — no `any`
- All LLM calls go through `/api/*` routes — never from client components

## Current phase
**Phase 2 — complete. Phase 3 starting.**

Phase 1 tasks (all done):
- [x] Bootstrap: `npx create-next-app@latest` + copy scaffold into project dir
- [x] Install: `npm install @anthropic-ai/sdk react-markdown rehype-highlight`
- [x] Create `/lib/anthropic.ts` — singleton Anthropic client
- [x] Copy architect system prompt to `/prompts/architect_agent.txt`
- [x] Write clarification system prompt to `/prompts/clarification_agent.txt`
- [x] Implement `/api/clarify/route.ts` — POST, returns `{ questions: string[] }`
- [x] Implement `/api/generate/route.ts` — POST, returns streaming text
- [x] Smoke test with curl — routes respond; 401 on placeholder key as expected

Phase 2 tasks (all done):
- [x] Build `/app/page.tsx` — wizard state machine (`idle → clarifying → answering → generating → done`)
- [x] Build `<DescriptionInput />` — textarea, char count, project type badge selector
- [x] Build `<ClarificationForm />` — renders questions, collects answers
- [x] Wire wizard: POST to `/api/clarify` on step 1 submit, render questions
- [x] Wire wizard: POST to `/api/generate` on step 2 submit, stream output to `<MarkdownRenderer />`
- [x] Build `<MarkdownRenderer />` — `react-markdown` + `rehype-highlight`, streaming-safe
- [x] `hooks/useRequirementsGenerator.ts` — `useReducer` state machine, streaming fetch

Phase 3 tasks (all done):
- [x] `ANTHROPIC_API_KEY` set in `.env.local` and Vercel env vars
- [x] Copy-to-clipboard with "✓ Copied!" 2s feedback, Download .md
- [x] `<GenerationStats />` — generation time, token count, cost, model label, shown after done
- [x] Scroll-to-bottom via `useEffect` + sentinel `div ref` while streaming
- [x] Retry generation button in error state (re-runs last params via `lastGenParams` ref)
- [x] Deployed and live at https://requirements-architect.vercel.app

Phase 4 tasks (all done):
- [x] Created `/lib/templates/` with 5 JSON files (7 stack items, 3–4 arch decisions, 4 phase hints each)
- [x] Template loader `lib/templates/index.ts` — `formatTemplateContext()` returns markdown block or null for custom
- [x] `buildArchitectPrompt()` accepts `templateContext: string | null`, injects between answers and generate instruction
- [x] `/api/generate/route.ts` calls `formatTemplateContext(projectType)` and passes result to prompt builder
- [x] Deployed to https://requirements-architect.vercel.app

Phase 5 tasks (polish & hardening — all done):
- [x] 30s timeout on Anthropic calls — AbortController + friendly inline error message streamed to client
- [x] `<ErrorBoundary />` around `<MarkdownRenderer />` in both generating and done steps
- [x] Open Graph + Twitter card meta tags in `layout.tsx`
- [x] README.md — setup, env vars, local dev, deploy instructions

## Cost guards
- Max output tokens: 3000 (Architect Agent)
- Rate limit: 10 req/IP/hour — enforce in both API routes
- Never call Architect Agent without prior Clarification Agent run in same session
- Log token estimates to console on every generation

## Do not
- Inline system prompts in TypeScript — always read from /prompts/*.txt
- Call Anthropic from client-side components
- Commit .env.local or any file with ANTHROPIC_API_KEY
- Use streaming for the Clarification Agent — blocking is fine for 5 short questions
- Use dangerouslySetInnerHTML for markdown — always use react-markdown
- Add a database in v1
- Skip testing streaming on Vercel before shipping (local ≠ Vercel behaviour)
- Skip the rate limiter
