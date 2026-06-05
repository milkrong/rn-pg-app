export type CoachConsent = {
  includeCycleData: boolean;
  includeSymptoms: boolean;
};

export type CycleSummary = {
  cycleDay: number;
  fertileWindow: string;
  recentSymptoms: string[];
};

export type CoachRequest = {
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  responseFormat: "structured-health-coach";
};

const DIAGNOSIS_PATTERNS = [
  "确诊",
  "诊断为",
  "你患有",
  "一定是",
  "处方",
  "用药剂量"
];

export function buildCoachRequest(input: {
  userQuestion: string;
  consent: CoachConsent;
  cycleSummary: CycleSummary;
}): CoachRequest {
  const context: string[] = [];

  if (input.consent.includeCycleData) {
    context.push(`周期第 ${input.cycleSummary.cycleDay} 天`);
    context.push(`预测易孕窗口：${input.cycleSummary.fertileWindow}`);
  }

  if (input.consent.includeSymptoms && input.cycleSummary.recentSymptoms.length > 0) {
    context.push(`近期身体信号：${input.cycleSummary.recentSymptoms.join("、")}`);
  }

  return {
    responseFormat: "structured-health-coach",
    messages: [
      {
        role: "system",
        content:
          "你是备孕健康管理应用的 AI 教练。提供记录、生活方式和就医沟通建议；不要诊断疾病，不要替代医生。回答必须温和、具体、非恐吓。"
      },
      {
        role: "user",
        content: [`授权上下文：${context.join("；") || "未授权健康数据"}`, `问题：${input.userQuestion}`].join("\n")
      }
    ]
  };
}

export function containsMedicalDiagnosisLanguage(answer: string): boolean {
  return DIAGNOSIS_PATTERNS.some((pattern) => answer.includes(pattern));
}
