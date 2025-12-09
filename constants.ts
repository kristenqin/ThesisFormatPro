import { TemplateConfig } from './types';

// Keeping MOCK_TEMPLATES for type safety if referenced, but main logic will use text input
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
  }
];

export const SAMPLE_FORMAT_REQUIREMENTS = `
1. 字体要求：正文使用宋体，小四号字；一级标题使用黑体，三号字，居中；二级标题黑体四号。
2. 行距：全文档设置为1.5倍行距。
3. 标点符号：中文语境下必须使用全角标点，英文参考文献中使用半角标点。
4. 引用格式：参考文献采用 [1], [2] 的上标形式引用，参考文献列表按引用顺序排列。
5. 章节编号：使用 1.1, 1.1.1 的阿拉伯数字编号形式。
`;

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
你是一位专业的学术论文排版审查专家。
你的任务是根据用户提供的【目标格式要求】来分析用户上传的【论文内容（HTML格式）】。

用户上传的是 Word 文档转换后的 HTML 代码。你需要通过分析 HTML 标签结构来判断排版格式是否规范。

你需要识别以下具体的格式问题（并用中文返回结果）：

1. **标题层级错误** (HEADING_LEVEL): 
   - 检查 HTML 标签。例如，如果格式要求一级标题，但内容被包裹在 <p><strong>...</strong></p> (仅加粗) 而不是 <h1>...</h1> 中，这就是典型的“伪标题”错误。
   - 检查标题编号是否连续（如 1.1 后面接了 1.3）。

2. **引用格式错误** (CITATION):
   - 检查上标引用。例如，如果格式要求上标 [1]，但 HTML 中是 [1] 而没有 <sup> 标签，或者使用了 (Author, Year) 格式，指出错误。

3. **标点符号错误** (PUNCTUATION):
   - 检查中文语境下的标点（如使用了半角 ',' '.' 而不是全角 '，' '。'）。
   - 检查中英文混排时的空格。

4. **字体与强调问题** (FONT):
   - 检查不必要的加粗或斜体（strong/em 标签使用是否泛滥）。
   - 虽然 HTML 看不到具体的“宋体/黑体”，但可以通过标签推断逻辑结构。

5. **其他结构问题** (OTHER):
   - 段落是否过长。
   - 是否存在空的 <p></p> 标签作为间距（这是不规范的排版，应建议使用段落间距）。

请务必返回一个严格有效的 JSON 对象。所有描述性文字（description, suggestion, summary）必须使用中文。
`;