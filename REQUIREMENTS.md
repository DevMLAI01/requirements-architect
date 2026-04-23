# REQUIREMENTS.md
## REQUIREMENTS Architect — Claude Code Build Guide
### AI-powered REQUIREMENTS.md generator · Solo build · v1.0 · 2026-04-22

---

## 1. Project context & motivation

Manual scaffolding of REQUIREMENTS.md files is the highest-friction step before starting any AI/ML project in Claude Code or Cursor. Practitioners with strong domain knowledge still spend 1–3 hours producing a well-structured document that covers phases, architecture decisions, cost models, and CLAUDE.md scaffolds.

This tool automates that scaffolding via a two-agent pipeline: a Clarification Agent (identifies gaps in the project description) followed by an Architect Agent (synthesises a full REQUIREMENTS.md from description + answers). The output is a production-grade markdown document ready to drop into a Claude Code session.

The tool is built as a Next.js web app, deployed on Vercel (free tier), stateless, with no database required for v1. It calls the Anthropic API directly from the backend (Next.js API routes) using `claude-sonnet-4-6`.

---

## 2. Goals

- Accept a plain-English project description in a web textarea
- Run a Clarification Agent that returns 3–5 targeted follow-up questions
- Accept user answers, then run the Architect Agent to generate a full REQUIREMENTS.md
- Stream the output to the UI in real time using Anthropic streaming API
- Render the markdown with syntax highlighting; allow one-click copy and `.md` download
- Deploy to Vercel free tier with zero database dependencies
- Keep Anthropic API cost per generation under $0.05 USD (Sonnet, ~3k tokens output)

### Non-goals (v1)

- User accounts or authentication — single anonymous session per browser tab
- Saved history or generation library — stateless by design
- GitHub push integration — clipboard + download is sufficient for v1
- Multi-model support (GPT, Gemini) — Anthropic-only for v1
- Mobile-optimised UI — desktop browser is the primary target
- Paid tier or Stripe integration — free tool first, monetise on traction

---

## 3. Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | File-based routing, API routes co-located, Vercel-native deployment. No separate backend needed. |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, zero-config dark mode, shadcn gives accessible components without a design system build. |
| Markdown rendering | `react-markdown` + `rehype-highlight` | Lightweight, supports syntax highlighting in fenced code blocks, works with streaming partial markdown. |
| LLM — Clarification Agent | `claude-sonnet-4-6` | 3–5 smart questions require contextual reasoning. Haiku produces generic questions. One-time call, low token cost. |
| LLM — Architect Agent | `claude-sonnet-4-6` | Full REQUIREMENTS.md generation needs strong instruction-following and structured output quality. Non-negotiable. |
| Streaming | Anthropic streaming API via `stream: true` | Progressive rendering. User sees output in <1s vs. 15–20s blank wait for full response. |
| API layer | Next.js API Routes (`/api/clarify`, `/api/generate`) | Co-located with frontend, no separate Express server, Vercel serverless-compatible. |
| State management | React `useState` + `useReducer` | No Redux/Zustand needed. Two-step wizard state fits local component state. |
| Deployment | Vercel (free tier) | Zero config for Next.js, automatic preview deployments, serverless functions included. |
| Environment secrets | Vercel environment variables | `ANTHROPIC_API_KEY` set in Vercel dashboard, never in repo. |
| Template library | JSON files in `/lib/templates/` | Curated few-shot examples per project type, injected into Architect Agent system prompt at runtime. |

---

## 4. Phase breakdown

### Phase 1 — Project scaffold & API foundation
**Target: 2 days · Deliverable: working `/api/clarify` endpoint, tested via curl**

- `npx create-next-app@latest requirements-architect --typescript --tailwind --app` to bootstrap
- Install dependencies: `anthropic`, `react-markdown`, `rehype-highlight`, `shadcn/ui`
- Create `/lib/anthropic.ts` — singleton Anthropic client, reads `ANTHROPIC_API_KEY` from env
- Create `/prompts/clarification_agent.txt` — Clarification Agent system prompt
- Create `/prompts/architect_agent.txt` — Architect Agent system prompt (from the system prompt file already written)
- Implement `/api/clarify/route.ts` — POST, accepts `{ description: string }`, returns `{ questions: string[] }` as JSON
- Implement `/api/generate/route.ts` — POST, accepts `{ description: string, answers: string[] }`, returns streaming text response
- Smoke test both endpoints with curl before building any UI
- Add `.env.local` with `ANTHROPIC_API_KEY`, add to `.gitignore`

### Phase 2 — Clarification wizard UI
**Target: 2 days · Deliverable: working two-step form, questions render dynamically**

- Build `/app/page.tsx` — main page layout, two-step wizard state machine: `idle → clarifying → answering → generating → done`
- Step 1: `<DescriptionInput />` component — large textarea, character count, "Analyse project" submit button
- On submit: POST to `/api/clarify`, show loading skeleton, render returned questions
- Step 2: `<ClarificationForm />` component — renders one text input per question, "Generate REQUIREMENTS.md" button
- State shape: `{ step, description, questions, answers, output, isLoading, error }`
- Wire form validation: description min 50 chars, all questions must be answered before generate is enabled
- Add project type badge selector (optional pre-fill): AIOps / Data Lakehouse / RAG Agent / LLM Eval / Job Pipeline / Custom

### Phase 3 — Streaming output renderer
**Target: 2 days · Deliverable: markdown streams in token-by-token, copy + download work**

- Implement streaming fetch in `useRequirementsGenerator` custom hook — reads `ReadableStream` from `/api/generate`, appends chunks to state
- Build `<MarkdownRenderer />` component — wraps `react-markdown` with `rehype-highlight`, re-renders on each chunk append
- Toolbar row above renderer: filename display, "Copy .md" button (clipboard API), "Download .md" button (Blob + anchor), token count display
- Add scroll-to-bottom behaviour as content streams in
- Handle stream errors gracefully — show error state with retry button
- Add `<GenerationStats />` — shows estimated token count and API cost per generation (calculated client-side from char count approximation)

### Phase 4 — Template library & system prompt injection
**Target: 1–2 days · Deliverable: 5 curated templates improve generation quality measurably**

- Create `/lib/templates/` directory with JSON files: `aiops_triage.json`, `data_lakehouse.json`, `rag_agent.json`, `llm_eval.json`, `job_pipeline.json`
- Each template: `{ name, description, stack[], phases[], architecture_decisions[], cost_model_hint }`
- In `/api/generate/route.ts`: detect project type from description (keyword match or user badge selection), inject matching template as few-shot example into Architect Agent system prompt
- Add `/lib/prompts.ts` — `buildArchitectPrompt(description, answers, template)` function that assembles the final system prompt at runtime
- Test each template: verify output quality vs. no-template baseline

### Phase 5 — Polish, error handling & Vercel deploy
**Target: 1 day · Deliverable: deployed to vercel.app URL, shareable**

- Add rate limiting guard in API routes: max 10 requests per IP per hour (in-memory, resets on cold start — sufficient for v1)
- Add timeout handling: if Anthropic API call exceeds 30s, return 504 with friendly message
- Add `<ErrorBoundary />` around the renderer
- Write `README.md`: setup instructions, env var list, local dev steps, deploy instructions
- Set `ANTHROPIC_API_KEY` in Vercel environment variables dashboard
- Run `vercel deploy --prod`, verify streaming works on production (not just local)
- Add Open Graph meta tags for shareability

---

## 5. Data models

```typescript
// lib/types.ts

export type WizardStep =
  | 'idle'
  | 'clarifying'
  | 'answering'
  | 'generating'
  | 'done'
  | 'error';

export type ProjectType =
  | 'aiops'
  | 'data_lakehouse'
  | 'rag_agent'
  | 'llm_eval'
  | 'job_pipeline'
  | 'custom';

export interface WizardState {
  step: WizardStep;
  description: string;
  projectType: ProjectType;
  questions: string[];           // returned by Clarification Agent
  answers: Record<number, string>; // keyed by question index
  output: string;                // streamed markdown accumulator
  tokensEstimate: number;
  error: string | null;
}

// API request/response shapes
export interface ClarifyRequest {
  description: string;
  projectType: ProjectType;
}

export interface ClarifyResponse {
  questions: string[];
}

export interface GenerateRequest {
  description: string;
  projectType: ProjectType;
  answers: string[];             // ordered, maps 1:1 to questions
}
// GenerateResponse is a streaming text/event-stream
```

```typescript
// lib/templates/types.ts

export interface ProjectTemplate {
  name: string;
  projectType: ProjectType;
  description: string;           // used in system prompt as few-shot context
  defaultStack: StackItem[];
  phaseHints: string[];          // injected as guidance, not prescriptive
  architectureDecisions: ArchDecision[];
  costModelHint: string;         // e.g. "Haiku Batch + Sonnet shortlist pattern"
}

export interface StackItem {
  layer: string;
  choice: string;
  rationale: string;
}

export interface ArchDecision {
  decision: string;
  choice: string;
  rationale: string;
}
```

---

## 6. Testing & eval strategy

**Unit tests (Jest + React Testing Library)**
- `/api/clarify`: mock Anthropic client, assert response shape `{ questions: string[] }`, assert min 3 / max 5 questions
- `/api/generate`: mock streaming response, assert stream opens and emits chunks
- `buildArchitectPrompt()`: assert template injection for each of 5 project types
- `<MarkdownRenderer />`: assert h1/h2/code blocks render from raw markdown input

**Integration tests**
- Full wizard flow with real Anthropic API (gated behind `INTEGRATION=true` env flag)
- Assert output contains all 8 required sections by heading string match
- Assert CLAUDE.md scaffold appears as a fenced code block in output
- Assert generation completes in under 45s on production Vercel

**LLM output quality checks (manual, weekly)**
- Run 5 generations across all 5 project types
- Score each on: section completeness (8/8), rationale specificity, CLAUDE.md actionability
- Target: ≥4.0/5.0 average across dimensions
- Log failures and adjust system prompt in `/prompts/architect_agent.txt`

**Regression baseline**
- Save 5 golden output fixtures in `/tests/fixtures/golden_outputs/`
- Run section-heading diff against golden outputs after any system prompt change
- Alert (console warn) if a section disappears from output

---

## 7. Cost model

```
Per generation (one user session):

Clarification Agent (claude-sonnet-4-6):
  Input:  ~800 tokens  (system prompt + description)
  Output: ~200 tokens  (5 questions)
  Cost:   (800 × $3.00 + 200 × $15.00) / 1,000,000
        = $0.0024 + $0.0030 = $0.0054

Architect Agent (claude-sonnet-4-6):
  Input:  ~2,500 tokens (system prompt + description + answers + template)
  Output: ~2,000 tokens (full REQUIREMENTS.md)
  Cost:   (2500 × $3.00 + 2000 × $15.00) / 1,000,000
        = $0.0075 + $0.0300 = $0.0375

Total per generation: ~$0.043 USD (~$0.06 CAD)
────────────────────────────────────────────────
At 10 generations/day:  ~$0.43/day  → ~$13/month CAD
At 50 generations/day:  ~$2.15/day  → ~$64/month CAD
At 100 generations/day: ~$4.30/day  → ~$129/month CAD

Free tier is viable up to ~10 generations/day.
Rate limiting (10 req/IP/hour) keeps abuse cost bounded.
No database = no additional infrastructure cost.
Vercel free tier: 100GB bandwidth, 100k serverless invocations/month — sufficient for v1.
```

---

## 8. CLAUDE.md scaffold

```markdown
# CLAUDE.md
## REQUIREMENTS Architect — Claude Code Context

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
│   ├── page.tsx                  # Main wizard UI
│   ├── layout.tsx
│   └── api/
│       ├── clarify/route.ts      # Clarification Agent endpoint
│       └── generate/route.ts     # Architect Agent streaming endpoint
├── components/
│   ├── DescriptionInput.tsx
│   ├── ClarificationForm.tsx
│   ├── MarkdownRenderer.tsx
│   └── GenerationStats.tsx
├── lib/
│   ├── anthropic.ts              # Singleton Anthropic client
│   ├── prompts.ts                # buildArchitectPrompt() function
│   ├── types.ts                  # WizardState, ProjectTemplate, etc.
│   └── templates/                # JSON files, one per project type
│       ├── aiops_triage.json
│       ├── data_lakehouse.json
│       ├── rag_agent.json
│       ├── llm_eval.json
│       └── job_pipeline.json
├── prompts/
│   ├── clarification_agent.txt   # System prompt — never inline in code
│   └── architect_agent.txt       # System prompt — never inline in code
├── hooks/
│   └── useRequirementsGenerator.ts
├── tests/
│   └── fixtures/golden_outputs/
├── .env.local                    # ANTHROPIC_API_KEY (never commit)
├── CLAUDE.md                     # This file
└── REQUIREMENTS.md               # This document
```

## Conventions
- All system prompts live in `/prompts/*.txt` — never inline in TypeScript
- `buildArchitectPrompt()` in `/lib/prompts.ts` assembles the final prompt at runtime
- All API route handlers are in `/app/api/*/route.ts` (Next.js App Router convention)
- Streaming responses use `new ReadableStream()` + `TransformStream` pattern — see `/api/generate/route.ts`
- shadcn components installed via `npx shadcn-ui@latest add <component>` — never hand-rolled
- TypeScript strict mode enabled — no `any` types
- Environment variables: only `ANTHROPIC_API_KEY` required. Read via `process.env.ANTHROPIC_API_KEY`

## Current phase
**Phase 1 in progress.**
- [x] Project bootstrapped with create-next-app
- [ ] `/lib/anthropic.ts` singleton client
- [ ] `/prompts/clarification_agent.txt` — write the clarification system prompt
- [ ] `/prompts/architect_agent.txt` — copy from architect_agent_system_prompt.md
- [ ] `/api/clarify/route.ts` — POST endpoint returning { questions: string[] }
- [ ] `/api/generate/route.ts` — POST endpoint, streaming response
- [ ] Smoke test both endpoints with curl

Next: implement `/api/clarify/route.ts` first. Use the Anthropic SDK messages.create() — non-streaming for this endpoint since questions are short.

## Cost guards
- Both agents use claude-sonnet-4-6 — no Haiku needed (output quality matters here)
- Rate limit: 10 requests per IP per hour (in-memory Map in API route module scope)
- Max output tokens: 3000 for Architect Agent — sufficient for full REQUIREMENTS.md
- Max input tokens: warn in console if assembled prompt exceeds 4000 tokens
- Never call the Architect Agent without first running the Clarification Agent in the same session

## Do not
- Inline system prompt strings in TypeScript files — always read from /prompts/*.txt
- Call Anthropic API from client-side components — all LLM calls go through /api/* routes
- Store the ANTHROPIC_API_KEY in .env (committed) — use .env.local only
- Use the streaming endpoint for the Clarification Agent — it returns 5 short questions, blocking is fine
- Render raw HTML from markdown — always use react-markdown, never dangerouslySetInnerHTML
- Add a database in v1 — stateless is a feature, not a limitation
- Deploy without verifying streaming works on Vercel (local dev streaming ≠ Vercel streaming behaviour)
- Skip the rate limiter — without it, one bad actor can run up significant API costs
```

---

## How to use this file in Claude Code

### Session startup command
Paste this at the start of every Claude Code session:

```
Read CLAUDE.md and REQUIREMENTS.md. We are building the REQUIREMENTS Architect app.
Current phase is listed in CLAUDE.md under "Current phase". 
Pick up exactly where we left off and continue with the next unchecked task.
Do not summarise the plan — start coding immediately.
```

### Phase transition command
When a phase is done, paste:

```
Phase N is complete. Update CLAUDE.md: mark Phase N tasks as done [x],
set Current phase to Phase N+1, and list the first 3 tasks for Phase N+1.
Then start the first task immediately.
```

### Stuck / debugging command
```
Read CLAUDE.md for context. I am stuck on: [describe problem].
Relevant files: [list files]. Do not refactor anything outside these files.
Fix only the specific issue described.
```
