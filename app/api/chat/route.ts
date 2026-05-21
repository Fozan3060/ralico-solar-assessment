import {
  createDataStreamResponse,
  formatDataStreamPart,
  generateObject,
  streamText,
  type CoreMessage,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";

import type { CollectedData } from "@/lib/types";
import { EXTRACTION_INSTRUCTIONS, SYSTEM_PROMPT } from "@/lib/prompts";
import {
  EMPTY_COLLECTED,
  isAssessmentComplete,
  mergeCollected,
} from "@/lib/collected";
import { MOCK_TURNS } from "@/lib/mock-turns";

// Two Groq round-trips per request (chat + extract). Groq is fast, but
// give the serverless function enough headroom.
export const maxDuration = 30;

// Per-phase model split for latency vs. accuracy:
//   - chat (streamed)     → 8B for snappy time-to-first-token
//   - extraction (after)  → 70B for reliable structured output
const CHAT_MODEL = "llama-3.1-8b-instant";
const EXTRACTION_MODEL = "llama-3.3-70b-versatile";

const extractionSchema = z.object({
  property_type: z.string().nullable(),
  annual_electricity_bill_gbp: z.number().nullable(),
  number_of_occupants: z.number().int().nullable(),
  heating_system: z.string().nullable(),
  solar_interest: z.string().nullable(),
  bill_unknown: z.boolean(),
});

function asText(content: CoreMessage["content"]): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

export async function POST(req: Request) {
  // Read per-request so dev-mode env edits take effect without a restart.
  const mockMode = process.env.MOCK_MODE === "true";

  if (!mockMode && !process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, currentCollected } = (body ?? {}) as {
    messages?: CoreMessage[];
    currentCollected?: Partial<CollectedData>;
  };

  const conversation: CoreMessage[] = Array.isArray(messages) ? messages : [];
  // Whatever the client already had — the floor that fields can never
  // regress below during extraction.
  const collectedSoFar: CollectedData = {
    ...EMPTY_COLLECTED,
    ...(currentCollected ?? {}),
  };

  if (mockMode) {
    const userMessageCount = conversation.filter(
      (m) => m.role === "user",
    ).length;
    const turnIndex = Math.max(0, userMessageCount - 1);
    const mock = MOCK_TURNS[Math.min(turnIndex, MOCK_TURNS.length - 1)];

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const words = mock.text.split(/(\s+)/).filter(Boolean);
        for (const word of words) {
          dataStream.write(formatDataStreamPart("text", word));
          await new Promise((resolve) => setTimeout(resolve, 45));
        }
        dataStream.writeData({
          type: "collected",
          collected: mock.collected,
          bill_unknown: mock.bill_unknown,
          complete: mock.complete,
        });
      },
    });
  }

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: groq(CHAT_MODEL),
        system: SYSTEM_PROMPT,
        messages: conversation,
        temperature: 0.6,
        // Once the chat reply has streamed, re-read the whole transcript
        // and extract the current state of all five fields.
        onFinish: async ({ text }) => {
          try {
            const transcript = [
              ...conversation.map(
                (m) =>
                  `${m.role === "user" ? "User" : "Assistant"}: ${asText(
                    m.content,
                  )}`,
              ),
              `Assistant: ${text}`,
            ].join("\n");

            const { object } = await generateObject({
              model: groq(EXTRACTION_MODEL),
              schema: extractionSchema,
              system: EXTRACTION_INSTRUCTIONS,
              temperature: 0,
              prompt:
                `Conversation so far:\n\n${transcript}\n\n` +
                `Extract each field's currently confirmed value, or null if it ` +
                `has not yet been confirmed by the homeowner.`,
            });

            const { bill_unknown, ...collectedFromExtraction } = object;
            const merged = mergeCollected(
              collectedSoFar,
              collectedFromExtraction,
            );

            dataStream.writeData({
              type: "collected",
              collected: merged,
              bill_unknown,
              complete: isAssessmentComplete(merged, bill_unknown),
            });
          } catch (error) {
            console.error("[api/chat] extraction failed:", error);
            // Surface the failure to the client so the panel doesn't sit
            // silently frozen. We intentionally do NOT also write a
            // `collected` part — the client keeps its previous state.
            const raw =
              error instanceof Error ? error.message : String(error);
            // Pull the human-friendly Groq message out of the wrapped
            // payload if present, otherwise fall back to the raw string.
            let message = raw;
            const groqMatch = raw.match(
              /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/,
            );
            if (groqMatch) message = groqMatch[1].replace(/\\"/g, '"');
            dataStream.writeData({ type: "extraction_error", message });
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      console.error("[api/chat] stream error:", error);
      return "Sorry — something went wrong generating a response. Please try again.";
    },
  });
}
