# Build Workflow — Ralico Solar Assessment

> **Planning discussion (Claude.ai web chat):** https://claude.ai/share/dc38a254-c3e8-4fac-959d-ec5b97fd4334
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

### fix/polish-followup

Visual redesign (dark theme, hero orb, glassmorphic shell) plus a long arc of
chasing one specific bug: **the user speaks, but the mic doesn't capture it**.
The root cause turned out to be a single line of configuration; finding it
took several wrong turns. Documenting the arc here because the wrong turns
were the most instructive part.

**Visual polish**

- Solid amber sun orb (3 nested rings + halo + gradient core + shimmer +
  orbital dashed ring on active states); colour shifts cyan when listening.
- `<Waveform>` between orb and caption — cosine-envelope bars (taller in the
  middle), fades in/out smoothly so the layout never jumps.
- `<LiveCaption>` with karaoke-style highlight — words brighten in sync with
  the spoken word via `SpeechSynthesisUtterance.onboundary`. Fallback when
  the browser doesn't fire `onboundary` (Firefox): everything stays bright,
  which is fine.
- `<ProgressDots>` above the orb + a slim amber progress bar at the bottom of
  the data panel. Two complementary progress reads.
- Field cards in the panel mirror the real global activity (`activityState`
  prop) — labels and colours change to "Asking…" / "Listening…" / "Thinking…"
  matching the orb so the panel never claims listening when the mic is closed.
- `<MeshBackground>` — three radial gradient blobs (amber/cyan/violet) over a
  fine dot grid + vignette. Pure CSS, no animation loops needed.
- `<JsonOutput>` — line-numbered, syntax-highlighted final JSON with a Copy
  button. Cyan keys, amber strings, violet numbers.

**Voice / mic capture — the engineering arc**

The visible bug: orb turns cyan, user speaks immediately, first word gets
dropped. Especially short single-syllable answers like "flat" or "two".
Inconsistent across attempts.

Wrong hypotheses (and what I tried before finding the real fix):

1. *"Speaker tail is bleeding into the mic"* — added a 700ms settle delay
   between TTS `onEnd` and `recognition.start()`. Helped marginally on the
   first word but didn't solve it.
2. *"Chrome's onresult fires too late"* — enabled `interimResults: true` so
   partial transcripts surface as the user speaks. This was useful (gave us
   the live "YOU SAID …" UI element) but didn't address the underlying
   capture problem.
3. *"The orb lies about listening state"* — discovered that Chrome's
   `onaudiostart` event fires when capture actually begins (separately from
   the moment `recognition.start()` returns, which is just acknowledging the
   request). Tied `isListening = true` to that event, so the cyan orb only
   appears when Chrome is genuinely capturing. The right architectural change
   — but the underlying bug was elsewhere.
4. *"We need to restart on silence-timeout"* — Chrome closes the session
   after ~5s of silence with `continuous: false`. Added an auto-restart
   loop. Worked partially but introduced new bugs: race conditions on rapid
   `no-speech` events, visible orb flicker during the restart gap, lost
   speech in the 100ms reopen window. Three iterations, each adding more
   compensation. None felt right.

The actual fix: **`recognition.continuous = true`**.

With `false` (the default most tutorials use), Chrome treats the session as
a single utterance and closes it on the first detected silence — that's what
was forcing the restart loop. With `true`, Chrome treats it as a dictation
stream: pauses don't close the session, multiple final results stream in
within one long-running session. No restart loop needed, no flicker, no
race conditions.

End-of-utterance detection then becomes our problem. Pattern: each final
result resets a 1500ms debounce timer. As long as the user keeps speaking
(even with thoughtful mid-sentence pauses), the timer keeps getting pushed.
When it finally expires, the accumulated text fires as one user message to
the LLM.

The whole arc taught me that the Web Speech API is more flexible than most
tutorials suggest — most articles use `continuous: false` and write
workarounds for the silence-close behaviour. For any genuinely
conversational use case, `continuous: true` is the right default.

**Visible errors instead of silent failures**

Extraction failures (especially Groq rate limits) were being silently
swallowed by a `catch` block that wrote a stale fallback `collected` part.
Result: the panel just stopped updating with no explanation, and the user
had no idea why their answer didn't show up.

Fix: added a separate `extraction_error` data part type. The client maintains
a `latest-of-each-type` mapping for the streaming data parts (because just
finding the latest of any-type meant a fallback `collected` could mask a
more recent error). A red dismissable banner above the progress dots renders
the actual upstream error message verbatim. Recruiters testing now see
exactly what's wrong, including the Groq URL to upgrade if they hit the
free-tier limit.

Same banner also surfaces mic errors (`not-allowed`, `audio-capture`,
`network`) with actionable messages. `no-speech` and `aborted` are routine
and stay silent.

**STT mishear recovery**

Two complementary mechanisms for when Chrome's top-1 transcript is wrong:

- **`maxAlternatives = 5`** — Chrome's STT generates multiple candidate
  transcripts internally but only returns the top one by default. Bumping
  to 5 means when "terraced" comes back as "terrorist", the right answer is
  usually in the top 5. The hook accumulates them and passes through to the
  LLM with a `[STT alts: …]` annotation, stripped before display.
- **Phonetic-similarity rule** in chat and extraction prompts. For when
  Chrome's top-5 doesn't contain the right word but a phonetic near-miss
  does ("terrace" → "terraced", "flack" → "flat", "boy lure" → "boiler").
  Mirrored across both prompts so the chat phase and extraction phase don't
  disagree (an earlier bug we hit: chat accepted, extraction said null,
  panel stayed empty).

**Heating-system spec alignment**

The original brief listed 6 heating options including "heat pump"; the
recruiter's actual email lists 5 (heat pump folded into "other"). Aligned
to the email — the contract is the contract. Heat pump answers normalise
to `"other"` in extraction with a comment explaining why.

**State-aware hint line**

Small text above the composer that mirrors the orb colour in plain words:
"Thinking…" / "Wait until the orb turns blue…" / "● Speak now" / "Tap the
mic to speak". Teaches the orb-colour convention without docs, and tells
the user the exact next action when the mic closes on Chrome's hard limit.
