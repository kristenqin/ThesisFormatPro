import JSZip from 'jszip';

export interface DocxStyleSummary {
  fonts: Set<string>;
  styles: Record<string, any>;
  docProperties: any;
  rawXmlAnalysis: string;
}

/**
 * Parses a .docx file to extract internal style definitions (styles.xml)
 * and document properties. This allows AI to analyze actual formatting
 * (font names, spacing values) rather than just HTML structure.
 */
export const parseDocxStyles = async (file: File): Promise<string> => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Read styles.xml to get style definitions (Heading 1, Normal, etc.)
    const stylesXml = await zip.file("word/styles.xml")?.async("text");
    
    // 2. Read document.xml to see actual usage (optional, usually large)
    // We strictly focus on styles for config analysis to save tokens
    
    if (!stylesXml) {
      return "无法读取文档样式定义 (word/styles.xml 不存在)";
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(stylesXml, "text/xml");
    const styles = xmlDoc.getElementsByTagName("w:style");

    let report = "【文档内部样式定义分析 (基于 word/styles.xml)】:\n";
    const importantStyles = ['Normal', '1', '2', '3', 'Title', 'Subtitle', 'Default Paragraph Font']; // IDs or names

    for (let i = 0; i < styles.length; i++) {
      const style = styles[i];
      const styleId = style.getAttribute("w:styleId");
      const nameNode = style.getElementsByTagName("w:name")[0];
      const name = nameNode ? nameNode.getAttribute("w:val") : styleId;

      // Filter to keep the report concise for AI context window
      // Check if it's a heading or normal text
      const isHeading = styleId?.toLowerCase().includes("heading");
      const isNormal = styleId?.toLowerCase().includes("normal") || name === "Normal";
      
      if (isHeading || isNormal) {
        report += `\n[样式名称: ${name} (ID: ${styleId})]`;
        
        // Font
        const rPr = style.getElementsByTagName("w:rPr")[0];
        if (rPr) {
          const rFonts = rPr.getElementsByTagName("w:rFonts")[0];
          if (rFonts) {
            const ascii = rFonts.getAttribute("w:ascii");
            const eastAsia = rFonts.getAttribute("w:eastAsia"); // This is usually the Chinese font
            report += `\n  - 字体: 西文="${ascii || '默认'}", 中文="${eastAsia || '默认'}"`;
          }
          
          const sz = rPr.getElementsByTagName("w:sz")[0]; // value is in half-points (e.g. 24 = 12pt)
          if (sz) {
            const val = parseInt(sz.getAttribute("w:val") || "0");
            report += `\n  - 字号: ${val} (即 ${val/2}pt)`;
          }

          const b = rPr.getElementsByTagName("w:b")[0];
          if (b && b.getAttribute("w:val") !== "0") report += `\n  - 加粗: 是`;
        }

        // Paragraph (Spacing)
        const pPr = style.getElementsByTagName("w:pPr")[0];
        if (pPr) {
           const spacing = pPr.getElementsByTagName("w:spacing")[0];
           if (spacing) {
             const line = spacing.getAttribute("w:line"); // 240 = 1x, 360 = 1.5x
             const lineRule = spacing.getAttribute("w:lineRule");
             report += `\n  - 行距: ${line} (规则: ${lineRule})`;
           }
           
           const jc = pPr.getElementsByTagName("w:jc")[0];
           if (jc) {
             report += `\n  - 对齐: ${jc.getAttribute("w:val")}`;
           }
        }
      }
    }

    return report;

  } catch (e) {
    console.error("Error parsing docx styles:", e);
    return "无法解析 .docx 内部 XML 结构，仅基于文本内容分析。";
  }
};
