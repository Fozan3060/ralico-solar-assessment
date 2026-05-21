# Ralico — Solar Property Assessment

**Live:** _[URL pending — added after deploy]_
**Stack:** Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui · Vercel AI SDK v4 · Groq

A two-way voice conversation that collects 5 property details and displays them as JSON.

## LLM Choice

Groq, with two models per turn: `llama-3.1-8b-instant` for the streamed chat (snappy time-to-first-token), and `llama-3.3-70b-versatile` in a second `generateObject` call for reliable structured field extraction. Free tier handles demo volume comfortably.

## One thing the AI got wrong

The original brief assumed a **text-only** chat — the user types, the AI replies in text. Not truly conversational. **Fix:** rebuilt voice-first with `SpeechRecognition` (mic in) and `speechSynthesis` (AI speaks back) in a hands-free turn-based loop, so the user and the assistant actually *talk* to each other.

## What I would improve

- **Always-on voice via VAD + Groq Whisper** — replace browser `SpeechRecognition` with `getUserMedia` + Silero VAD + Groq Whisper-large-v3 (same Groq account, ~95% accuracy, ~500ms latency). Removes the silence-timeout cycle and most mishears; unlocks barge-in.
- **CRM / email trigger** on completion (Slack or HubSpot webhook).
- **`src/` directory** to separate application code from root config at scale.

---

## Local development

```bash
npm install
cp .env.example .env.local   # add GROQ_API_KEY
npm run dev                  # http://localhost:3000
```

For the **full engineering journey** (architectural decisions, voice/mic deep-dive, every wrong turn), see [`WORKFLOW.md`](./WORKFLOW.md).
