import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type CoachRequest = {
  question: string;
  sessionId?: string;
  context: {
    cycleDay?: number;
    fertileWindow?: string;
    recentSignals?: string[];
  };
};

type CoachAnswer = {
  answer: string;
  suggestions: string[];
  safety_notice: string;
};

const DAILY_LIMITS = {
  free: 3,
  pro: 30
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4.1-mini";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey) {
    return json({ error: "OPENROUTER_API_KEY is not configured" }, 500);
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json({ error: "Supabase server secrets are not configured" }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Authorization header is required" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } }
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return json({ error: "A signed-in user is required" }, 401);
  }

  let body: CoachRequest;
  try {
    body = (await req.json()) as CoachRequest;
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  const question = body.question?.trim();
  if (!question) {
    return json({ error: "Question is required" }, 400);
  }

  if (question.length > 1200) {
    return json({ error: "Question is too long" }, 400);
  }

  const quota = await getAiMessageQuota(supabaseAdmin, authData.user.id);
  if (!quota.allowed) {
    return json(
      {
        error: "Daily AI coach limit reached",
        usage: {
          messagesUsedToday: quota.messagesUsedToday,
          dailyLimit: quota.dailyLimit
        }
      },
      429
    );
  }

  const context = [
    body.context.cycleDay ? `周期第 ${body.context.cycleDay} 天` : null,
    body.context.fertileWindow ? `易孕窗口：${body.context.fertileWindow}` : null,
    body.context.recentSignals?.length ? `近期信号：${body.context.recentSignals.join("、")}` : null
  ].filter(Boolean).join("；");

  const sessionId = await getOrCreateSession(supabaseAdmin, authData.user.id, body.sessionId);
  await supabaseAdmin.from("coach_messages").insert({
    user_id: authData.user.id,
    session_id: sessionId,
    role: "user",
    content: question,
    metadata: { context: body.context ?? {} }
  });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "http-referer": "https://vyjryphiugsfslvorgoc.supabase.co",
      "x-title": "Nurture"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是备孕健康管理应用的 AI 教练。提供记录、生活方式和就医沟通建议；不要诊断疾病，不要替代医生。回答必须温和、具体、非恐吓。只输出 JSON，字段必须且只能是 answer、suggestions、safety_notice。"
        },
        {
          role: "user",
          content: `授权上下文：${context || "未授权健康数据"}\n问题：${question}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fertility_coach_answer",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: { type: "string" },
              suggestions: { type: "array", items: { type: "string" } },
              safety_notice: { type: "string" }
            },
            required: ["answer", "suggestions", "safety_notice"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const providerError = await response.text();
    console.error("OpenRouter request failed", response.status, providerError.slice(0, 500));
    return json(
      {
        error: "AI provider request failed",
        providerStatus: response.status,
        providerMessage: providerError.slice(0, 300)
      },
      502
    );
  }

  const payload = await response.json();
  const answer = parseCoachAnswer(payload);
  const usage = await recordAiMessageUsage(supabaseAdmin, authData.user.id, quota);

  await supabaseAdmin.from("coach_messages").insert({
    user_id: authData.user.id,
    session_id: sessionId,
    role: "assistant",
    content: answer.answer,
    metadata: {
      suggestions: answer.suggestions,
      safety_notice: answer.safety_notice,
      provider: "openrouter",
      provider_response_id: payload.id,
      model: payload.model ?? model
    }
  });

  return json(
    {
      ...answer,
      sessionId,
      usage: {
        messagesUsedToday: usage.messagesUsedToday,
        dailyLimit: usage.dailyLimit
      }
    },
    200
  );
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

type AiMessageQuota = {
  allowed: boolean;
  dailyLimit: number;
  messagesUsedToday: number;
  today: string;
};

async function getAiMessageQuota(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<AiMessageQuota> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: entitlement, error: entitlementError } = await supabaseAdmin
    .from("entitlements")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (entitlementError) {
    throw entitlementError;
  }

  const plan = entitlement?.plan === "pro" ? "pro" : "free";
  const dailyLimit = DAILY_LIMITS[plan];
  const { data: usage, error: usageError } = await supabaseAdmin
    .from("ai_usage")
    .select("messages_used")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (usageError) {
    throw usageError;
  }

  const messagesUsedToday = usage?.messages_used ?? 0;
  if (messagesUsedToday >= dailyLimit) {
    return { allowed: false, dailyLimit, messagesUsedToday, today };
  }

  return { allowed: true, dailyLimit, messagesUsedToday, today };
}

async function recordAiMessageUsage(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  quota: AiMessageQuota
): Promise<{ dailyLimit: number; messagesUsedToday: number }> {
  const nextUsage = quota.messagesUsedToday + 1;
  const { error: upsertError } = await supabaseAdmin.from("ai_usage").upsert(
    {
      user_id: userId,
      usage_date: quota.today,
      messages_used: nextUsage
    },
    { onConflict: "user_id,usage_date" }
  );

  if (upsertError) {
    throw upsertError;
  }

  return { dailyLimit: quota.dailyLimit, messagesUsedToday: nextUsage };
}

async function getOrCreateSession(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  requestedSessionId?: string
): Promise<string> {
  if (requestedSessionId) {
    const { data, error } = await supabaseAdmin
      .from("coach_sessions")
      .select("id")
      .eq("id", requestedSessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data.id;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("coach_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

function parseCoachAnswer(payload: {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
}): CoachAnswer {
  const content = payload.choices?.[0]?.message?.content;
  const outputText = Array.isArray(content)
    ? content
        .map((item) => item.text)
        .filter(Boolean)
        .join("\n")
    : content;

  if (!outputText) {
    throw new Error("OpenRouter returned an empty response");
  }

  const parsed = JSON.parse(extractJsonObject(outputText)) as Partial<
    CoachAnswer & { message: string; response: string }
  >;

  return {
    answer: parsed.answer ?? parsed.response ?? parsed.message ?? "",
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    safety_notice:
      parsed.safety_notice ?? "这些建议不能替代医生诊断；如有异常疼痛、出血或长期未孕，请咨询医生。"
  };
}

function extractJsonObject(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fencedJson?.[1]) {
    return fencedJson[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}
