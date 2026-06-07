import type { CoachConsent, CycleSummary } from "@/domain/ai";

import { getSupabaseFunctionUrl, requireSupabase } from "./supabase";

export type CoachAnswer = {
  answer: string;
  suggestions: string[];
  safety_notice: string;
  sessionId: string;
  usage: {
    messagesUsedToday: number;
    dailyLimit: number;
  };
};

export async function askAiCoach(input: {
  question: string;
  consent: CoachConsent;
  cycleSummary: CycleSummary;
}): Promise<CoachAnswer> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<CoachAnswer>("ai-coach", {
    body: {
      question: input.question,
      context: {
        cycleDay: input.consent.includeCycleData ? input.cycleSummary.cycleDay : undefined,
        fertileWindow: input.consent.includeCycleData ? input.cycleSummary.fertileWindow : undefined,
        recentSignals: input.consent.includeSymptoms ? input.cycleSummary.recentSymptoms : undefined
      }
    }
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("AI coach returned an empty response.");
  }

  return data;
}

export async function askAiCoachStream(
  input: {
    question: string;
    consent: CoachConsent;
    cycleSummary: CycleSummary;
  },
  callbacks: {
    onDelta: (text: string) => void;
    onFinal?: (answer: CoachAnswer) => void;
  }
): Promise<CoachAnswer> {
  const supabase = requireSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("A signed-in Supabase user is required.");
  }

  const response = await fetch(getSupabaseFunctionUrl("ai-coach"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stream: true,
      question: input.question,
      context: {
        cycleDay: input.consent.includeCycleData ? input.cycleSummary.cycleDay : undefined,
        fertileWindow: input.consent.includeCycleData ? input.cycleSummary.fertileWindow : undefined,
        recentSignals: input.consent.includeSymptoms ? input.cycleSummary.recentSymptoms : undefined
      }
    })
  });

  if (!response.ok) {
    throw await parseStreamError(response);
  }

  if (!response.body) {
    const answer = await askAiCoach(input);
    await emitTypewriterText(answer.answer, callbacks.onDelta);
    callbacks.onFinal?.(answer);
    return answer;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalAnswer: CoachAnswer | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventText of events) {
      const event = parseSseEvent(eventText);
      if (!event) {
        continue;
      }

      if (event.type === "delta") {
        callbacks.onDelta(event.value);
      }

      if (event.type === "final") {
        finalAnswer = event.value;
        callbacks.onFinal?.(event.value);
      }

      if (event.type === "error") {
        throw new Error(event.value);
      }
    }
  }

  if (!finalAnswer) {
    throw new Error("AI coach stream ended without a final answer.");
  }

  return finalAnswer;
}

async function parseStreamError(response: Response): Promise<Error> {
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { error?: string };
    return new Error(payload.error ?? "AI coach stream failed.");
  } catch {
    return new Error(text || "AI coach stream failed.");
  }
}

function parseSseEvent(value: string):
  | { type: "delta"; value: string }
  | { type: "final"; value: CoachAnswer }
  | { type: "error"; value: string }
  | null {
  const event = value
    .split("\n")
    .find((line) => line.startsWith("event: "))
    ?.slice("event: ".length)
    .trim();
  const data = value
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length))
    .join("\n");

  if (!event || !data) {
    return null;
  }

  const parsed = JSON.parse(data);

  if (event === "delta") {
    return { type: "delta", value: String(parsed.text ?? "") };
  }

  if (event === "final") {
    return { type: "final", value: parsed as CoachAnswer };
  }

  if (event === "error") {
    return { type: "error", value: String(parsed.error ?? "AI coach stream failed.") };
  }

  return null;
}

async function emitTypewriterText(text: string, onDelta: (text: string) => void) {
  for (const char of text) {
    onDelta(char);
    await new Promise((resolve) => setTimeout(resolve, 14));
  }
}
