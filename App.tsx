import React, { useState } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { AnalysisReport } from './components/AnalysisReport';
import { analyzeText, fixText } from './services/geminiService';
import { AppStep, TemplateConfig, AnalysisResult } from './types';
import { MOCK_TEMPLATES, SAMPLE_TEXT } from './constants';
import { FileText, Loader2, Check, Copy, RefreshCw, ChevronRight, Upload, BookOpen } from 'lucide-react';

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [inputText, setInputText] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(MOCK_TEMPLATES[0].id);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [fixedText, setFixedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const selectedTemplate = MOCK_TEMPLATES.find(t => t.id === selectedTemplateId) || MOCK_TEMPLATES[0];

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      alert("请输入需要分析的文本。");
      return;
    }

    setCurrentStep(AppStep.ANALYZING);
    setIsLoading(true);
    setLoadingMessage('正在初始化 AI 分析器...');

    try {
      const templateRules = JSON.stringify(selectedTemplate.rules);
      
      // Artificial delay for better UX (so user sees the loading steps)
      setTimeout(() => setLoadingMessage('扫描文档结构...'), 800);
      setTimeout(() => setLoadingMessage('检查引用格式...'), 1600);
      setTimeout(() => setLoadingMessage('校验标点与间距...'), 2400);

      const result = await analyzeText(inputText, templateRules);
      setAnalysisResult(result);
      setCurrentStep(AppStep.REPORT);
    } catch (error) {
      console.error(error);
      alert("分析失败，请重试。");
      setCurrentStep(AppStep.UPLOAD);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFix = async () => {
    if (!analysisResult) return;

    setCurrentStep(AppStep.FIXING);
    setIsLoading(true);
    setLoadingMessage('正在执行自动修复...');

    try {
      setTimeout(() => setLoadingMessage('标准化字体与间距...'), 1000);
      setTimeout(() => setLoadingMessage('修正引用格式...'), 2000);

      const issuesDescription = analysisResult.issues
        .map(i => `${i.type}: Change "${i.originalText}" to "${i.suggestion}"`)
        .join('\n');
      
      const fixed = await fixText(inputText, issuesDescription);
      setFixedText(fixed);
      setCurrentStep(AppStep.RESULT);
    } catch (error) {
      console.error(error);
      alert("修复失败，请重试。");
      setCurrentStep(AppStep.REPORT);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fixedText);
    alert("已复制到剪贴板！");
  };

  const resetApp = () => {
    setCurrentStep(AppStep.UPLOAD);
    setAnalysisResult(null);
    setFixedText('');
    setInputText('');
  };

  const loadSample = () => {
    setInputText(SAMPLE_TEXT.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ThesisFormatPro</h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            AI 驱动的学术论文格式化工具
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10 px-4">
        <StepIndicator currentStep={currentStep} />

        {/* Step 1: Upload / Input */}
        {currentStep === AppStep.UPLOAD && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                1. 选择格式标准
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOCK_TEMPLATES.map((t) => (
                  <div 
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`
                      cursor-pointer p-4 rounded-lg border-2 transition-all
                      ${selectedTemplateId === t.id 
                        ? 'border-indigo-600 bg-indigo-50/50' 
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${selectedTemplateId === t.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {t.name}
                      </span>
                      {selectedTemplateId === t.id && <Check className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-500">{t.institution}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-700">
                  2. 粘贴论文内容
                </label>
                <button 
                  onClick={loadSample}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50"
                >
                  <FileText size={14} /> 加载示例文本
                </button>
              </div>
              <textarea
                className="flex-1 w-full p-4 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono text-sm leading-relaxed text-slate-700 resize-none"
                placeholder="请在此粘贴您的论文章节（摘要、引言、正文、参考文献等）..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={!inputText.trim()}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                开始格式分析 <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Loading States (Analyzing & Fixing) */}
        {(currentStep === AppStep.ANALYZING || currentStep === AppStep.FIXING) && (
          <div className="max-w-md mx-auto mt-20 text-center animate-in fade-in duration-500">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                {currentStep === AppStep.ANALYZING ? <BookOpen className="text-indigo-600 w-8 h-8" /> : <RefreshCw className="text-indigo-600 w-8 h-8" />}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {currentStep === AppStep.ANALYZING ? '正在分析文档' : '正在润色文档'}
            </h2>
            <p className="text-slate-500 animate-pulse">{loadingMessage}</p>
          </div>
        )}

        {/* Step 3: Report */}
        {currentStep === AppStep.REPORT && analysisResult && (
          <AnalysisReport 
            result={analysisResult} 
            onFix={handleFix} 
            onCancel={() => setCurrentStep(AppStep.UPLOAD)} 
          />
        )}

        {/* Step 5: Result */}
        {currentStep === AppStep.RESULT && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={24} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-1">格式调整完成！</h2>
                <p className="text-green-700">您的文档已根据 {selectedTemplate.name} 标准化。</p>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
              <div className="flex flex-col h-full">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-500">原始文本</span>
                 </div>
                 <textarea
                  readOnly
                  value={inputText}
                  className="flex-1 w-full p-4 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 font-mono text-sm resize-none focus:outline-none"
                 />
              </div>

              <div className="flex flex-col h-full">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-indigo-600">修复结果</span>
                    <button 
                      onClick={copyToClipboard}
                      className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1"
                    >
                      <Copy size={12} /> 复制
                    </button>
                 </div>
                 <textarea
                  readOnly
                  value={fixedText}
                  className="flex-1 w-full p-4 rounded-lg bg-white border-2 border-indigo-100 text-slate-800 font-mono text-sm resize-none focus:outline-none shadow-sm"
                 />
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <button
                onClick={resetApp}
                className="px-8 py-3 bg-white border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={18} /> 开始新的分析
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}