# Ralico — Solar Property Assessment

**Live:** _[URL pending — added after deploy]_
**Stack:** Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui · Vercel AI SDK v4 · Groq

A two-way voice conversation that collects 5 property details and displays them as JSON.

## LLM Choice

Groq with `llama-3.3-70b-versatile`. Free tier handles demo volume comfortably, sub-second inference keeps the conversation snappy, and `generateObject` + Zod gives strictly-typed field extraction in a second model call per turn.

## One thing the AI got wrong

The original brief assumed a **text-only** chat — the user types, the AI replies in text. Not truly conversational. **Fix:** rebuilt voice-first with `SpeechRecognition` (mic in) and `speechSynthesis` (AI speaks back) in a hands-free turn-based loop, so the user and the assistant actually *talk* to each other.

## What I would improve

- **Edge-case handling** — graceful "I don't know" answers (e.g. user doesn't know their exact bill) and ambiguous inputs.
- **CRM / email trigger** on completion (Slack or HubSpot webhook).
- **`src/` directory** to separate application code from root config at scale.
- **Full-duplex voice** — barge-in mid-sentence (needs a WebRTC stack, not browser speech).
