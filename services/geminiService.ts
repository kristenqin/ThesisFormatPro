import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, FormatErrorType, Severity } from '../types';
import { GEMINI_SYSTEM_PROMPT } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeText = async (text: string, templateRules: string): Promise<AnalysisResult> => {
  const ai = getClient();
  
  const prompt = `
    请根据以下规则分析这段论文文本：${templateRules}。
    
    需要分析的文本：
    """
    ${text.substring(0, 10000)} 
    """
    (注：如果文本过长已被截断)

    请返回一个 JSON 对象，包含：
    - score (0-100 的整数)
    - summary (简短的中文总结段落)
    - issues (问题数组，包含 id, type, severity, description, originalText, suggestion)
    
    字段说明：
    - type 枚举值: PUNCTUATION, HEADING_LEVEL, SPACING, CITATION, FONT, OTHER
    - severity 枚举值: CRITICAL, WARNING, INFO
    - description: 问题描述 (请用中文)
    - suggestion: 修改建议 (请用中文)
    - originalText: 原文片段
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      summary: { type: Type.STRING },
      issues: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(FormatErrorType) },
            severity: { type: Type.STRING, enum: Object.values(Severity) },
            description: { type: Type.STRING },
            originalText: { type: Type.STRING },
            suggestion: { type: Type.STRING },
            location: { type: Type.STRING },
          },
          required: ['id', 'type', 'severity', 'description', 'originalText', 'suggestion']
        }
      }
    },
    required: ['score', 'summary', 'issues']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Return a fallback error result so the UI doesn't crash
    return {
      score: 0,
      summary: "由于 API 错误，无法分析文档。",
      issues: [{
        id: "error-1",
        type: FormatErrorType.OTHER,
        severity: Severity.CRITICAL,
        description: "API 连接失败",
        originalText: "N/A",
        suggestion: "请检查 API Key 并重试。"
      }]
    };
  }
};

export const fixText = async (text: string, issuesDescription: string): Promise<string> => {
  const ai = getClient();
  
  const prompt = `
    你是一个自动格式化程序。请根据下列具体问题重写文本。
    不要改变语义，只修正格式（标点、间距、标题样式、引用）。
    仅返回修复后的文本，不要包含其他解释。

    需要修复的问题：
    ${issuesDescription}

    原始文本：
    """
    ${text}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini Fix Error:", error);
    return text; // Return original if fix fails
  }
};