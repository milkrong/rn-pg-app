import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type CoachRequest = {
  question: string;
  context: {
    cycleDay?: number;
    fertileWindow?: string;
    recentSignals?: string[];
  };
};

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

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json({ error: "OPENAI_API_KEY is not configured" }, 500);
  }

  const body = (await req.json()) as CoachRequest;
  const context = [
    body.context.cycleDay ? `周期第 ${body.context.cycleDay} 天` : null,
    body.context.fertileWindow ? `易孕窗口：${body.context.fertileWindow}` : null,
    body.context.recentSignals?.length ? `近期信号：${body.context.recentSignals.join("、")}` : null
  ].filter(Boolean).join("；");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "你是备孕健康管理应用的 AI 教练。提供记录、生活方式和就医沟通建议；不要诊断疾病，不要替代医生。回答必须温和、具体、非恐吓。"
        },
        {
          role: "user",
          content: `授权上下文：${context || "未授权健康数据"}\n问题：${body.question}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "fertility_coach_answer",
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
    return json({ error: "AI provider request failed" }, 502);
  }

  const payload = await response.json();
  return json(payload, 200);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}
