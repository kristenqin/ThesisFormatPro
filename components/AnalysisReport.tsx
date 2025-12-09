import React from 'react';
import { AnalysisResult, Severity, FormatErrorType, FormatIssue } from '../types';
import { AlertCircle, ArrowRight, CheckCircle2, FileJson, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '../lib/utils';

interface AnalysisReportProps {
  result: AnalysisResult;
  onFix: () => void;
  onCancel: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ result, onFix, onCancel }) => {
  
  const getSeverityBadgeVariant = (s: Severity) => {
    switch (s) {
      case Severity.CRITICAL: return 'destructive';
      case Severity.WARNING: return 'default'; // In shadcn default is black, maybe warning should be something else? Let's stick to default/secondary or customize. 
      // Actually, standard shadcn badges are limited. I'll use default for High, Secondary for Warn.
      case Severity.INFO: return 'secondary';
      default: return 'outline';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 ring-green-100';
    if (score >= 70) return 'text-amber-600 bg-amber-50 ring-amber-100';
    return 'text-red-600 bg-red-50 ring-red-100';
  };

  const translateSeverity = (s: Severity) => {
    switch (s) {
      case Severity.CRITICAL: return '严重';
      case Severity.WARNING: return '警告';
      case Severity.INFO: return '提示';
      default: return s;
    }
  };

  const translateType = (t: FormatErrorType | string) => {
    switch (t) {
      case FormatErrorType.PUNCTUATION: return '标点符号';
      case FormatErrorType.HEADING_LEVEL: return '标题层级';
      case FormatErrorType.SPACING: return '间距问题';
      case FormatErrorType.CITATION: return '引用格式';
      case FormatErrorType.FONT: return '字体问题';
      case FormatErrorType.OTHER: return '其他问题';
      default: return t;
    }
  };

  // Safe access to issues
  const issues = result?.issues || [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header / Score Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileJson className="w-5 h-5 text-slate-500" />
              格式分析报告
            </CardTitle>
            <CardDescription className="text-base mt-2 max-w-2xl">
              {result.summary}
            </CardDescription>
          </div>
          <div className={cn("flex flex-col items-center justify-center w-20 h-20 rounded-full ring-4 ring-offset-2", getScoreColor(result.score || 0))}>
            <span className="text-2xl font-bold">{result.score || 0}</span>
          </div>
        </CardHeader>
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          检测到的问题 ({issues.length})
        </h3>
        
        {issues.length === 0 ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">完美！</AlertTitle>
            <AlertDescription className="text-green-700">
              未发现格式问题，您的文档完全符合模板标准。
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {issues.map((issue: FormatIssue) => (
              <Card key={issue.id} className="overflow-hidden border-l-4 border-l-slate-400">
                 <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadgeVariant(issue.severity)}>
                             {translateSeverity(issue.severity)}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                             {translateType(issue.type)}
                          </span>
                       </div>
                    </div>
                    <CardTitle className="text-base font-medium mt-2 leading-snug">
                       {issue.description}
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="bg-slate-50/50 py-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                      <div className="space-y-1">
                        <span className="text-xs text-red-500 font-semibold block uppercase">原文</span>
                        <div className="bg-white p-2.5 rounded border border-red-100 text-slate-600 break-words shadow-sm">
                          {issue.originalText}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-green-600 font-semibold block uppercase">修改建议</span>
                        <div className="bg-white p-2.5 rounded border border-green-100 text-slate-800 break-words shadow-sm">
                          {issue.suggestion}
                        </div>
                      </div>
                    </div>
                 </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} size="lg">
          返回编辑
        </Button>
        <Button 
          onClick={onFix} 
          disabled={issues.length === 0}
          size="lg"
          className="gap-2 pl-5 pr-6"
        >
           一键自动修复
           <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};