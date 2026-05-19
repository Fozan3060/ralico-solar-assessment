# Build Workflow — Ralico Solar Assessment

> **Planning discussion (Claude.ai web chat):** _[paste your Claude.ai share link here]_
>
> This is a running log of how the app was built with **Claude Code**, feature by
> feature. It's included for the recruiters — as the brief notes, the process tells
> you more than the code alone.

---

## Overview

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Vercel AI SDK v4 · Groq (`llama-3.3-70b-versatile`)
- **Branching:** trunk-based with a `develop` integration branch. One feature branch per
  slice, each merged into `develop` via a squash PR. Final release PR is `develop → main`.
- **Feature order:** project-setup → api-route → chat-ui → data-panel → complete-state → polish

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| AI SDK version | **v4** | The brief describes v4 APIs (`createDataStreamResponse`, `DataStreamWriter`, `data.append`). v5 renamed them all — v4 matches the spec exactly and lowers risk. |
| Next.js version | **15** (pinned) | `create-next-app@latest` resolved to v16; the brief requires Next 15, so `create-next-app@15` was pinned. |
| shadcn base | **Radix UI** + Nova preset | The classic, best-documented shadcn setup; Radix has full React 19 support. |

## Course corrections — what the AI got wrong

A running list of mistakes caught and fixed during the build (feeds the README's
"one thing the AI got wrong" section).

1. **Next.js version drift.** `create-next-app@latest` scaffolded **Next.js 16**, but the
   brief requires Next.js 15. Fix: pinned `create-next-app@15` and re-scaffolded.
2. **Conversation assumed text-only.** The initial plan treated the "conversation" as the
   user *typing* while the AI *speaks back* — not truly conversational. Fix: added
   browser Web Speech API voice input so the user can also speak to the assistant.

---

## Feature log

### feature/project-setup

- Scaffolded Next.js 15.5 (App Router, TypeScript, Tailwind v4) into the repo.
- Installed the AI stack: `ai@4`, `@ai-sdk/groq@1`, `zod@3`.
- Initialised shadcn/ui (Radix base) and added: `button`, `input`, `card`, `badge`,
  `scroll-area`, `separator`.
- Defined the shared `CollectedData` type in `lib/types.ts` — the single source of truth
  for the five collected fields, used by both the API route and the UI.
- Loaded Google Fonts via `next/font`: **Outfit** (body) and **JetBrains Mono** (code/JSON).
- Added `.env.example` (committed) and `.env.local` (gitignored) for the `GROQ_API_KEY`.
- Disabled the Claude co-author commit trailer via `.claude/settings.json`.
