import React from 'react';
import { AnalysisResult, Severity, FormatErrorType, FormatIssue } from '../types';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface AnalysisReportProps {
  result: AnalysisResult;
  onFix: () => void;
  onCancel: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ result, onFix, onCancel }) => {
  
  const getSeverityColor = (s: Severity) => {
    switch (s) {
      case Severity.CRITICAL: return 'bg-red-50 text-red-700 border-red-200';
      case Severity.WARNING: return 'bg-amber-50 text-amber-700 border-amber-200';
      case Severity.INFO: return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getSeverityIcon = (s: Severity) => {
    switch (s) {
      case Severity.CRITICAL: return <AlertCircle className="w-5 h-5 text-red-500" />;
      case Severity.WARNING: return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header / Score Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            格式分析报告
          </h2>
          <p className="text-slate-600 leading-relaxed">{result.summary}</p>
        </div>
        
        <div className={`flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 ${getScoreColor(result.score)}`}>
          <span className="text-3xl font-bold">{result.score}</span>
          <span className="text-xs uppercase font-medium tracking-wide opacity-80">评分</span>
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">检测到的问题 ({result.issues.length})</h3>
        </div>
        
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {result.issues.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">未发现格式问题！</p>
              <p>您的文档完全符合模板标准。</p>
            </div>
          ) : (
            result.issues.map((issue: FormatIssue) => (
              <div key={issue.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {getSeverityIcon(issue.severity)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getSeverityColor(issue.severity)}`}>
                        {translateSeverity(issue.severity)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {translateType(issue.type)}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{issue.description}</p>
                    
                    {/* Diff View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-slate-100 rounded-lg p-3 text-sm font-mono">
                      <div className="space-y-1">
                        <span className="text-xs text-red-500 font-semibold block">原文</span>
                        <div className="bg-white p-2 rounded border border-red-100 text-slate-600 break-words">
                          {issue.originalText}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-green-600 font-semibold block">修改建议</span>
                        <div className="bg-white p-2 rounded border border-green-100 text-slate-800 break-words">
                          {issue.suggestion}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
        >
          返回编辑
        </button>
        <button
          onClick={onFix}
          disabled={result.issues.length === 0}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          一键自动修复
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};