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
| Voice approach | **Browser Web Speech API** | Avatar APIs (HeyGen) and premium voice APIs all have small free tiers / per-minute cost; the browser's built-in `SpeechRecognition` + `speechSynthesis` are free, unlimited, no keys, no session caps — the only choice that's safe for a publicly deployed demo recruiters will test. |

## Course corrections — what the AI got wrong

A running list of mistakes caught and fixed during the build (feeds the README's
"one thing the AI got wrong" section).

1. **Next.js version drift.** `create-next-app@latest` scaffolded **Next.js 16**, but the
   brief requires Next.js 15. Fix: pinned `create-next-app@15` and re-scaffolded.
2. **Conversation was text-only — not truly conversational.** The original brief specified
   `SpeechRecognition` (user speech → text) but no `SpeechSynthesis`, leaving the AI silent.
   After the verbal interview made clear the recruiters wanted a *talking* AI, the app was
   rebuilt **voice-first**: the user speaks **and** the AI speaks back, in a hands-free
   turn-based call loop. The existing API route was modality-neutral, so the backend
   needed no changes.

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

> **On generated code:** the files in `components/ui/` are shadcn/ui primitives,
> generated verbatim by the shadcn CLI — the "copy it in and own it" model is exactly
> how shadcn is designed to work. Everything else — the API route, the chat interface,
> the data panel, the speech hook, the prompts and the helpers — is hand-written.

### feature/api-route

- Built `POST /api/chat` — the single backend endpoint. Each request runs two phases:
  - **Phase 1 (converse):** `streamText` with Groq `llama-3.3-70b-versatile` and the
    fixed system prompt, streamed to the client via `createDataStreamResponse`.
  - **Phase 2 (extract):** inside `streamText`'s `onFinish`, `generateObject` re-reads
    the whole transcript against a Zod schema and reports all five fields' values.
- **Safety merge** (`lib/collected.ts`): per field, take the new extraction unless
  it is `null`, in which case keep the previous value. So `null → value` (newly
  filled) and `value → newValue` (legitimate correction) both work, while
  `value → null` (the extraction-forgot-a-field bug) is rejected. The merged
  result plus a `complete` flag are appended to the stream as a
  `{ type: "collected" }` data part.
- Prompts isolated in `lib/prompts.ts`; collected-data helpers in `lib/collected.ts`.
- Extraction is best-effort: if it throws, the previously collected state is preserved.

### feature/chat-ui

- Built the voice-first conversation experience in `app/page.tsx` with the AI SDK `useChat` hook.
- **Voice both ways:** `use-speech-recognition` (browser STT — user speaks) and
  `use-speech-synthesis` (browser TTS — the assistant speaks). Both are browser-native —
  no API keys, no per-use cost, no session caps. `types/speech.d.ts` adds the
  declarations TypeScript is missing for `SpeechRecognition`.
- **Hands-free call loop:** when the assistant finishes a reply it is spoken aloud, and
  the moment speech ends the microphone re-opens to listen — turn-based, repeating until
  all five fields are collected.
- Animated `VoiceOrb` presence (idle / thinking / speaking / listening), message
  transcript with avatars and a bouncing typing indicator, progress bar, and a mute
  toggle in the header.
- Text remains a first-class fallback — typing always works, and the mic is hidden where
  the browser lacks `SpeechRecognition` (e.g. Firefox).
- Custom `{ type: "collected" }` data parts from the stream update the panel + completion
  state; each request re-sends `currentCollected` so the server-side safety merge holds.
- A hidden trigger message opens the assessment; the assistant's greeting is the first
  message that's actually rendered.

### feature/data-panel

- Polished the right sidebar into proper cards: a dedicated `FieldCard` per field with
  icon, label, value, and an amber-check pill when filled.
- **Scale-on-fill animation** — each card tracks its previous filled state with a `useRef`
  and fires a subtle `fill-pop` keyframe (`scale(1 → 1.04 → 1)`) the moment its value
  transitions from `null` → confirmed. The initial mount intentionally doesn't animate.
- Filled cards gain a faint amber border + warmer slate background; unfilled cards keep
  a muted italic "Pending" placeholder.
- Field metadata (icon, label, value-formatter) lives in `lib/fields.ts`, shared with
  the page so display order and labels stay consistent.

### feature/complete-state

- New `JsonOutput` component reveals below the field cards once `isComplete` flips true.
  - Amber "JSON" badge label.
  - `<pre>` block in JetBrains Mono on a dark terminal background.
  - Custom regex-based syntax highlighter: keys → sky, strings → emerald, numbers →
    orange, booleans → amber, null → muted slate. HTML-escaped first, so the output is
    safe to render via `dangerouslySetInnerHTML`.
  - Fades in + slides up on reveal (`animate-fade-in-up` keyframe).
- The composer lock (the "Assessment complete" bar) was already wired up in
  `feature/chat-ui` and continues to drive from the same `isComplete` flag.

### feature/polish

- **Mobile sweep** — capped the data panel at `40vh` with internal scroll on small
  screens so the chat doesn't get pushed off the viewport. Composer mic + send buttons
  use `shrink-0` so they can never overlap the text input on narrow screens.
- Added `app/loading.tsx` — a skeleton that silhouettes the start-screen layout so
  the swap into the real page isn't jarring.
- Wrote `README.md` (≤200 words) with the three required sections: LLM choice
  (Groq + `llama-3.3-70b-versatile`), one thing the AI got wrong (the voice-input
  gap), and what I would improve.
- **Edge-case fixes during polish:**
  - **Monthly vs annual bill** — silent 12× bug risk if the user said "£100" meaning
    monthly. Patched both prompts: `SYSTEM_PROMPT` now asks the user to clarify
    monthly vs annual on suspiciously small figures, and `EXTRACTION_INSTRUCTIONS`
    multiplies by 12 when the user explicitly says "per month" (and returns `null`
    on truly ambiguous units).
  - **"I don't know" handling for the bill** — `SYSTEM_PROMPT` now offers a typical
    UK estimate ("£800–£1,500 / year — does that sound about right?"); if the user
    still genuinely doesn't know, the extractor sets `bill_unknown: true`. The
    completion check (`isAssessmentComplete`) treats the bill as answered when
    either it has a value OR `bill_unknown` is true, so the conversation can end
    cleanly. The data panel flips the bill row from "Pending" to "Not sure" (still
    with the amber check). The final JSON keeps the brief's shape — bill is `null`
    when truly unknown — so the data contract is unchanged.
