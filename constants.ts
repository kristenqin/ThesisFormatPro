import { TemplateConfig } from './types';

export const MOCK_TEMPLATES: TemplateConfig[] = [
  {
    id: 'gbt-7713',
    name: 'GB/T 7713 国家标准',
    institution: '中国国家标准',
    rules: {
      fontMain: '宋体 (SimSun) 小四/12pt',
      headingHierarchy: ['黑体 三号', '黑体 四号', '黑体 小四'],
      lineSpacing: '1.5倍行距',
      citationStyle: 'GB/T 7714-2015',
      punctuation: '全角标点 (Full-width)',
    }
  },
  {
    id: 'top-uni-thesis',
    name: '研究生学位论文通用模板',
    institution: '国内双一流高校',
    rules: {
      fontMain: '中文字体宋体，英文字体 Times New Roman 12pt',
      headingHierarchy: ['第一章 黑体三号居中', '1.1 黑体四号', '1.1.1 黑体小四'],
      lineSpacing: '固定行距 20pt',
      citationStyle: 'APA 7th 或 GB/T 7714',
      punctuation: '中文全角，英文半角',
    }
  }
];

export const SAMPLE_TEXT = `
1. 引言
近年来人工智能技术发展迅速,然而在很多领域仍然存在问题...
1.1 研究背景
关于大语言模型的研究最早开始于2018年(Smith, 2018)。
2. 研究方法
我们使用Transformer模型分析数据.
结果如图1所示。
3. 结论
本文的格式非常混乱，存在中英文标点混用的情况。
参考文献
[1] Smith. AI development. 2018.
[2] 李四. 人工智能发展. 计算机学报.
`;

export const GEMINI_SYSTEM_PROMPT = `
你是一位专业的学术编辑和论文格式排版专家。
你的任务是根据严格的格式规则分析学术文本。
你需要识别以下问题（并用中文返回结果）：
1. 标点符号错误（例如：中文语境下使用了半角 ',' 而不是全角 '，'，或者中英文混排时的标点使用错误）。
2. 标题编号或层级不一致（例如：混用了 "1." 和 "第一章"）。
3. 参考文献引用格式错误。
4. 间距问题（例如：中英文之间缺失空格）。
5. 段落结构问题。

请务必返回一个严格有效的 JSON 对象。所有描述性文字（description, suggestion, summary）必须使用中文。
`;