export enum FormatErrorType {
  PUNCTUATION = 'PUNCTUATION',
  HEADING_LEVEL = 'HEADING_LEVEL',
  SPACING = 'SPACING',
  CITATION = 'CITATION',
  FONT = 'FONT',
  OTHER = 'OTHER'
}

export enum Severity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export interface FormatIssue {
  id: string;
  type: FormatErrorType;
  severity: Severity;
  description: string;
  originalText: string;
  suggestion: string;
  location?: string; // e.g., "Paragraph 3"
}

export interface AnalysisResult {
  score: number;
  issues: FormatIssue[];
  summary: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  institution: string;
  rules: {
    fontMain: string;
    headingHierarchy: string[];
    lineSpacing: string;
    citationStyle: string;
    punctuation: string;
  };
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  REPORT = 'REPORT',
  FIXING = 'FIXING',
  RESULT = 'RESULT'
}