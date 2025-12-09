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

// New function to extract text from Format PDF/Images
export const extractFormatRulesFromImage = async (
  base64Data: string, 
  mimeType: string
): Promise<string> => {
  const ai = getClient();
  
  const prompt = `
    你是一个OCR和文档理解助手。
    请阅读这张图片/PDF，它是一份【学术论文格式要求】文档。
    请提取其中所有的格式规则，并以清晰的纯文本列表形式返回。
    
    关注以下点：
    1. 字体要求 (如：宋体、Times New Roman、字号)
    2. 行距、页边距
    3. 标题层级格式
    4. 参考文献引用格式
    5. 标点符号要求
    
    请直接返回提取后的规则文本，不要包含开场白。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is fast and good for vision/extraction
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Format Extraction Error:", error);
    throw new Error("无法从文件中提取格式要求，请手动输入或重试。");
  }
};

export const analyzeText = async (
  content: string, 
  formatRequirements: string,
  docxStyleAnalysis?: string, // NEW: Raw Style XML analysis
  formatFileBase64?: string,
  formatFileMimeType?: string,
  isHtml: boolean = false,
  signal?: AbortSignal
): Promise<AnalysisResult> => {
  // Check if already aborted before starting
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const ai = getClient();
  
  // Construct the prompt content parts
  const parts: any[] = [];

  // 1. Add Format Requirements (PDF or Image)
  if (formatFileBase64 && formatFileMimeType) {
    parts.push({
      inlineData: {
        mimeType: formatFileMimeType, 
        data: formatFileBase64
      }
    });
    parts.push({
      text: `这是原始的【目标格式要求】文件供参考。`
    });
  }
  
  if (formatRequirements && formatRequirements.trim().length > 0) {
    parts.push({
      text: `这是整理后的【目标格式要求】文字说明（以此为准）：\n${formatRequirements}`
    });
  }

  // 2. Add Docx Internal Style Analysis (Ground Truth for Formatting)
  if (docxStyleAnalysis) {
    parts.push({
      text: `
      === 核心证据：.docx 文件内部样式定义 (Styles.xml 解析结果) ===
      AI 请注意：这是从 Word 文档底层 XML 中提取的真实样式数据。
      在判断“字体”、“字号”、“行距”是否合规时，**请优先依据此数据**，而不是下方的正文文本。
      
      ${docxStyleAnalysis}
      ===========================================================
      `
    });
  }

  // 3. Add Thesis Content (HTML or Text)
  parts.push({
    text: `
    === 待分析的论文正文内容 (${isHtml ? 'HTML结构' : '纯文本'}) ===
    (此部分主要用于检查标题结构、引用格式、标点符号等语义问题，字体/行距问题请参考上面的 XML 样式定义)
    """
    ${content.substring(0, 30000)} 
    """
    (注：如果内容过长已被截断)
    ================
    
    请根据上述【格式要求】分析用户的论文。
    `
  });

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
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 8192, // Ensure enough tokens for large JSON responses
      }
    });

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let text = response.text || "{}";
    
    // Robust JSON cleaning: Remove markdown code blocks if present
    if (text.includes("```")) {
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    // Attempt parse
    const parsed = JSON.parse(text);
    
    // Validate structure and ensure issues is an array (Prevent "undefined reading length")
    const result: AnalysisResult = {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      summary: typeof parsed.summary === 'string' ? parsed.summary : "分析完成，但未生成总结。",
      issues: Array.isArray(parsed.issues) ? parsed.issues : []
    };
    
    return result;

  } catch (error: any) {
    if (error.name === 'AbortError' || error.message === 'Aborted') {
       throw error; 
    }

    console.error("Gemini Analysis Error:", error);
    
    // If it's a JSON parse error, provide a more specific message in the UI fallback
    let errorMessage = "AI 服务暂时不可用";
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
       errorMessage = "AI 返回的数据格式不完整（可能是由于内容过长被截断），请尝试减少一次分析的文本量。";
    }

    return {
      score: 0,
      summary: "无法完成分析。请确保上传的文件内容清晰。",
      issues: [{
        id: "error-1",
        type: FormatErrorType.OTHER,
        severity: Severity.CRITICAL,
        description: errorMessage,
        originalText: "N/A",
        suggestion: "请重试或检查网络连接。"
      }]
    };
  }
};

export const fixText = async (text: string, issuesDescription: string): Promise<string> => {
  const ai = getClient();
  
  const prompt = `
    你是一个自动格式化程序。请根据下列具体问题重写文本。
    不要改变语义，只修正格式（标点、间距、标题样式、引用）。
    
    注意：输入可能是 HTML 或 Markdown 混合文本。
    如果包含 HTML 标签，请保留标签结构，只修正内容或必要的标签嵌套。
    
    需要修复的问题：
    ${issuesDescription}

    原始文本/HTML：
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