import type { CoachConsent, CycleSummary } from "@/domain/ai";

import { requireSupabase } from "./supabase";

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
