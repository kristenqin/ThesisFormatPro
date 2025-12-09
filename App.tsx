import React, { useState, useRef, useEffect } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { AnalysisReport } from './components/AnalysisReport';
import { analyzeText, fixText, extractFormatRulesFromImage } from './services/geminiService';
import { parseDocxStyles } from './services/docxParser';
import { AppStep, AnalysisResult } from './types';
import { SAMPLE_TEXT, SAMPLE_FORMAT_REQUIREMENTS } from './constants';
import { BookOpen, Check, ChevronRight, Copy, FileText, Loader2, RefreshCw, Upload, FileUp, Image as ImageIcon, X, FileType, Eye, PenLine, LayoutTemplate, Info, Wand2, Ban, AlertTriangle, ArrowRight } from 'lucide-react';
import mammoth from 'mammoth';
import { renderAsync } from 'docx-preview';

// Shadcn UI Imports
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Textarea } from './components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { cn } from './lib/utils';

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  
  // State for Inputs
  const [thesisText, setThesisText] = useState<string>(''); // Raw Text for fallback display
  const [thesisHtml, setThesisHtml] = useState<string>(''); // HTML Structure for AI Analysis
  const [thesisStyleAnalysis, setThesisStyleAnalysis] = useState<string>(''); // Raw XML Style Analysis
  const [thesisFile, setThesisFile] = useState<File | null>(null); // For Docx Preview
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('edit');
  
  const [formatRequirements, setFormatRequirements] = useState<string>('');
  
  // Format File State (PDF or Image)
  const [formatFileBase64, setFormatFileBase64] = useState<string | null>(null);
  const [formatFileMimeType, setFormatFileMimeType] = useState<string | null>(null);
  const [formatFileName, setFormatFileName] = useState<string | null>(null);
  const [formatFilePreview, setFormatFilePreview] = useState<string | null>(null);
  
  // State tracking logic
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [inputsChanged, setInputsChanged] = useState<boolean>(false); // Track if user modified inputs after analysis

  const [fixedText, setFixedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExtractingRules, setIsExtractingRules] = useState<boolean>(false); // State for rule extraction
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const thesisFileInputRef = useRef<HTMLInputElement>(null);
  const formatFileInputRef = useRef<HTMLInputElement>(null);
  const formatUploadInputRef = useRef<HTMLInputElement>(null);
  const docxPreviewRef = useRef<HTMLDivElement>(null);
  
  // Abort Controller for cancelling analysis
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to check if we are in docx preview mode
  const isDocxPreview = viewMode === 'preview' && thesisFile?.name.endsWith('.docx');

  // Word Count Helper (Excludes whitespace)
  const getWordCount = (text: string) => {
    return text.replace(/\s/g, '').length;
  };

  // Effect to render Docx Preview
  useEffect(() => {
    if (isDocxPreview && docxPreviewRef.current) {
      // Clear previous content
      docxPreviewRef.current.innerHTML = '';
      
      thesisFile!.arrayBuffer().then(buffer => {
        try {
          renderAsync(buffer, docxPreviewRef.current!, undefined, {
            className: 'docx-viewer', 
            inWrapper: true, // ENABLE WRAPPER
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false, // Must be false to use fonts from docx
            breakPages: true,
            ignoreLastRenderedPageBreak: false,
            experimental: true,
            trimXmlDeclaration: true,
            useBase64URL: false,
            renderChanges: false,
            debug: false,
          });
        } catch (e) {
          console.error("Docx render failed", e);
          docxPreviewRef.current!.innerHTML = '<div class="p-4 text-red-500">预览渲染失败，但不影响 AI 分析。</div>';
        }
      });
    }
  }, [viewMode, thesisFile, isDocxPreview]);

  // Navigation Handler
  const handleStepClick = (step: AppStep) => {
    // Only allow navigation to Upload if we are not loading
    if (isLoading) return;
    
    // Simple logic: Can always go back to Upload
    if (step === AppStep.UPLOAD) {
      setCurrentStep(AppStep.UPLOAD);
    } 
    // Can go to Report if we have a result
    else if (step === AppStep.REPORT && analysisResult) {
       // If inputs changed, warn or just go? 
       // Let's just go, user can click "Re-analyze" from Upload screen if they want to update
       setCurrentStep(AppStep.REPORT);
    }
  };

  const handleAnalyze = async () => {
    // Logic: If we already have a result and inputs haven't changed, just go to report
    if (analysisResult && !inputsChanged) {
      setCurrentStep(AppStep.REPORT);
      return;
    }

    if (!thesisText.trim()) {
      alert("请输入需要分析的论文内容。");
      return;
    }
    // We allow just text requirements OR just file requirements OR both
    if (!formatRequirements.trim() && !formatFileBase64) {
      alert("请提供格式要求（输入文本或上传 PDF/图片）。");
      return;
    }

    // Initialize AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setCurrentStep(AppStep.ANALYZING);
    setIsLoading(true);
    setLoadingMessage('正在初始化 AI 分析器...');

    try {
      setTimeout(() => { if (!controller.signal.aborted) setLoadingMessage('理解格式要求...') }, 800);
      setTimeout(() => { if (!controller.signal.aborted) setLoadingMessage('解析文档结构 (HTML)...') }, 1600);
      setTimeout(() => { if (!controller.signal.aborted) setLoadingMessage('深度扫描 Word 内部样式表...') }, 2400); 
      setTimeout(() => { if (!controller.signal.aborted) setLoadingMessage('进行排版合规性比对...') }, 3200);

      // CRITICAL CHANGE: Pass HTML if available, otherwise Text
      const contentToAnalyze = thesisHtml && thesisHtml.length > 0 ? thesisHtml : thesisText;
      const isHtml = !!(thesisHtml && thesisHtml.length > 0);

      // Pass inputs to the service with abort signal
      const result = await analyzeText(
        contentToAnalyze, 
        formatRequirements,
        thesisStyleAnalysis, 
        formatFileBase64 || undefined,
        formatFileMimeType || undefined,
        isHtml,
        controller.signal
      );
      
      setAnalysisResult(result);
      setInputsChanged(false); // Reset dirty flag
      setCurrentStep(AppStep.REPORT);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Aborted') {
        console.log("Analysis cancelled by user");
        // State reset is handled by the cancel function, or we can ensure it here
        return;
      }
      console.error(error);
      alert("分析失败，请重试。");
      setCurrentStep(AppStep.UPLOAD);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentStep(AppStep.UPLOAD);
  };

  const handleFix = async () => {
    if (!analysisResult) return;

    setCurrentStep(AppStep.FIXING);
    setIsLoading(true);
    setLoadingMessage('正在执行自动修复...');

    try {
      setTimeout(() => setLoadingMessage('应用格式规则...'), 1000);
      setTimeout(() => setLoadingMessage('重构文档结构...'), 2000);

      const issuesDescription = analysisResult.issues
        .map(i => `${i.type}: Change "${i.originalText}" to "${i.suggestion}"`)
        .join('\n');
      
      const contentToFix = thesisHtml && thesisHtml.length > 0 ? thesisHtml : thesisText;
      const fixed = await fixText(contentToFix, issuesDescription);
      
      const plainFixed = fixed.replace(/<[^>]+>/g, '');
      setFixedText(plainFixed);
      
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
    setInputsChanged(false);
    setFixedText('');
    setThesisText('');
    setThesisHtml('');
    setThesisStyleAnalysis('');
    setThesisFile(null);
    setViewMode('edit');
    setFormatRequirements('');
    clearFormatFile();
  };

  const loadSample = () => {
    setThesisText(SAMPLE_TEXT.trim());
    setThesisHtml(''); // Sample is plain text
    setThesisStyleAnalysis('');
    setThesisFile(null); 
    setFormatRequirements(SAMPLE_FORMAT_REQUIREMENTS.trim());
    clearFormatFile();
    setViewMode('edit');
    setInputsChanged(true); // Sample load counts as change
  };

  // Text / Docx file reader
  const handleThesisFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThesisFile(file);
    setInputsChanged(true); // Flag change

    // Check if it's a Word document
    if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // 1. Get Visual HTML (Preserves structure like headings, bolds, tables) for AI Context
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        setThesisHtml(htmlResult.value);

        // 2. Get Raw Text (For Fallback Display)
        const rawResult = await mammoth.extractRawText({ arrayBuffer });
        setThesisText(rawResult.value);
        
        // 3. NEW: Parse internal XML for strict Style Analysis (Font/Spacing)
        const styleReport = await parseDocxStyles(file);
        setThesisStyleAnalysis(styleReport);

        // 4. Set view mode to preview
        setViewMode('preview');
      } catch (error) {
        console.error("Error reading docx:", error);
        alert("无法读取 Word 文档，请确保文件未加密且格式正确 (.docx)。");
      }
    } else {
      // Fallback for .txt or .md
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setThesisText(content);
        setThesisHtml(''); 
        setThesisStyleAnalysis('');
        setViewMode('edit');
      };
      reader.readAsText(file);
    }
    
    e.target.value = '';
  };

  const handleTextRequirementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInputsChanged(true); // Flag change
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormatRequirements(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // Format File reader (PDF or Image) + Auto Extraction
  const handleFormatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      alert("仅支持 PDF 或图片格式。");
      return;
    }

    setInputsChanged(true); // Flag change

    // 1. Read file for preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      
      setFormatFileBase64(base64Data);
      setFormatFileMimeType(file.type);
      setFormatFileName(file.name);
      
      if (isImage) {
        setFormatFilePreview(result);
      } else {
        setFormatFilePreview(null);
      }

      // 2. Trigger AI Extraction automatically
      setIsExtractingRules(true);
      try {
        const extractedRules = await extractFormatRulesFromImage(base64Data, file.type);
        setFormatRequirements(prev => {
           // Append or Replace? Let's Replace if empty, Append if exists
           if (!prev) return extractedRules;
           return prev + "\n\n" + extractedRules;
        });
      } catch (err) {
        console.error("Extraction failed", err);
        // We don't block the UI, just don't populate the text
      } finally {
        setIsExtractingRules(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearFormatFile = () => {
    setFormatFileBase64(null);
    setFormatFileMimeType(null);
    setFormatFileName(null);
    setFormatFilePreview(null);
    setInputsChanged(true); // Flag change
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-950 flex flex-col selection:bg-slate-200">
      {/* Navbar */}
      <header className="border-b border-slate-200 sticky top-0 z-20 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-sm">
              <BookOpen size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">ThesisFormatPro</h1>
          </div>
          <div className="text-sm font-medium text-slate-500 hidden sm:block">
            AI 驱动的学术论文格式化工具
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-6">
        <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

        {/* Step 1: Upload / Input */}
        {currentStep === AppStep.UPLOAD && (
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div className="space-y-1">
                 <h2 className="text-2xl font-bold tracking-tight">上传您的文件</h2>
                 <p className="text-slate-500">请提供格式要求和论文正文（支持 Word 文档），我们将为您自动检查</p>
              </div>
              <Button variant="ghost" onClick={loadSample} className="text-slate-500">
                 <FileText className="mr-2 h-4 w-4" /> 加载示例数据
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Format Requirements (PDF/Image + Text) */}
              <Card className="flex flex-col h-auto lg:h-[700px] border-slate-200 shadow-md col-span-1">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-5">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileUp className="w-4 h-4" /> 格式要求
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    上传学校/期刊的格式规范 (PDF/图片)
                  </CardDescription>
                </CardHeader>
                
                <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
                   {/* File Upload Area - Hide if file uploaded */}
                   {!formatFileBase64 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group shrink-0" onClick={() => formatUploadInputRef.current?.click()}>
                        <input 
                          type="file" 
                          accept=".pdf,image/png,image/jpeg,image/jpg" 
                          ref={formatUploadInputRef} 
                          className="hidden"
                          onChange={handleFormatFileUpload}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                          <FileType className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">点击上传格式规范文件</p>
                        <p className="text-xs text-slate-400 mt-1">支持 PDF, PNG, JPG，上传后自动识别内容</p>
                    </div>
                   )}

                   {/* Preview File + Reset Action */}
                   {formatFileBase64 && (
                     <div className="relative w-full bg-slate-100 rounded-lg border border-slate-200 overflow-hidden group shrink-0 animate-in fade-in slide-in-from-top-2">
                        {formatFileMimeType === 'application/pdf' ? (
                          <div className="flex flex-col items-center justify-center text-slate-600 gap-2 p-6">
                            <div className="bg-red-50 p-2 rounded-md border border-red-100">
                              <FileType className="w-6 h-6 text-red-500" />
                            </div>
                            <span className="font-medium text-xs text-center px-2 w-full truncate">
                              {formatFileName}
                            </span>
                          </div>
                        ) : (
                          <div className="h-40 w-full flex items-center justify-center bg-slate-900/5">
                             <img src={formatFilePreview!} alt="Format Specs" className="h-full w-full object-contain p-2" />
                          </div>
                        )}
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-2 right-2 h-6 w-6 opacity-80 hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); clearFormatFile(); }}
                          title="删除文件"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                     </div>
                   )}

                   <div className="relative my-2 shrink-0">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400">文字明细 (支持编辑)</span>
                      </div>
                   </div>

                   {/* Text Input with Auto-Extraction Loading State */}
                   <div className="flex-1 min-h-[200px] relative flex flex-col">
                     <div className="relative flex-1">
                        <Textarea 
                            className="w-full h-full min-h-[200px] resize-none text-sm font-mono bg-slate-50 border-slate-200 focus:bg-white transition-colors p-3"
                            placeholder={isExtractingRules ? "正在从文件中提取规则..." : "在此补充特定格式要求 (如: 行距1.5倍, 标题黑体...)"}
                            value={formatRequirements}
                            onChange={(e) => {
                              setFormatRequirements(e.target.value);
                              setInputsChanged(true);
                            }}
                            disabled={isExtractingRules}
                          />
                          {isExtractingRules && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-md border border-slate-100">
                               <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                  <span className="text-xs text-slate-500 font-medium">正在AI识别格式规则...</span>
                               </div>
                            </div>
                          )}
                     </div>
                      
                      {!isExtractingRules && (
                        <div className="mt-2 flex justify-end gap-2">
                          <input 
                            type="file" 
                            accept=".txt,.md,.json" 
                            ref={formatFileInputRef} 
                            className="hidden"
                            onChange={handleTextRequirementUpload}
                          />
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => formatFileInputRef.current?.click()}
                              className="h-6 text-xs px-2 text-slate-500 hover:text-slate-900"
                            >
                              <Upload className="w-3 h-3 mr-1" /> 导入纯文本
                            </Button>
                        </div>
                      )}
                   </div>
                </div>
              </Card>

              {/* Right Column: Thesis Content (Preview Mode) */}
              <Card className="flex flex-col h-auto lg:h-[700px] border-slate-200 shadow-md col-span-1 lg:col-span-2 bg-slate-100/50">
                <CardHeader className="bg-white border-b border-slate-200 py-3 px-6 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" /> 论文预览
                      </CardTitle>
                      
                      {/* View Mode Toggles */}
                      <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                        <button
                          onClick={() => setViewMode('preview')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                            viewMode === 'preview' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                          )}
                        >
                          <Eye size={14} /> 格式视图
                        </button>
                        <button
                          onClick={() => setViewMode('edit')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                            viewMode === 'edit' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                          )}
                        >
                          <PenLine size={14} /> 文本模式
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        accept=".docx,.txt,.md" 
                        ref={thesisFileInputRef} 
                        className="hidden"
                        onChange={handleThesisFileUpload}
                      />
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => thesisFileInputRef.current?.click()}
                        className="h-8"
                      >
                        <Upload className="w-3.5 h-3.5 mr-2" /> 上传 Word
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <div className="flex-1 p-0 overflow-hidden flex flex-col items-center justify-start bg-slate-100/50 relative">
                   
                   {/* Warning about Pagination/Font Limitations */}
                   {isDocxPreview && (
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-max max-w-[95%] flex flex-col gap-1 items-center">
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-md">
                           <Info size={14} className="text-blue-500" />
                           <span>
                             <strong>高保真预览：</strong> 
                             AI 正在深入分析文档的<strong>内部样式表 (XML)</strong>，确保字体/行距检测准确。
                           </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50/80 px-2 py-1 rounded-full border border-slate-100">
                           <AlertTriangle size={10} className="text-amber-500" />
                           <span>Web 预览可能存在分页偏差，字体受限于本地系统。</span>
                        </div>
                     </div>
                   )}

                  {/* Document Preview Simulation Container */}
                  <div 
                    className={cn(
                      "transition-all duration-300 relative",
                      isDocxPreview 
                        ? "w-full h-full bg-slate-200/50" // Full width/height for Docx Wrapper
                        : "w-full max-w-[210mm] bg-white shadow-lg border border-slate-200 min-h-[600px] h-full flex flex-col my-6 mx-auto" // A4 Paper look for text
                    )}
                  >
                     
                     {viewMode === 'preview' ? (
                       <div className="flex-1 w-full overflow-auto relative h-full docx-container-isolation">
                          {isDocxPreview ? (
                             <div ref={docxPreviewRef} className="w-full h-full" />
                          ) : thesisText ? (
                             // Fallback for simple text preview
                             <div className="p-10 prose max-w-none text-slate-900 whitespace-pre-wrap font-serif leading-relaxed">
                               {thesisText}
                             </div>
                          ) : (
                             <div className="flex flex-col items-center justify-center h-full opacity-40 absolute inset-0">
                               <LayoutTemplate className="w-16 h-16 text-slate-300 mb-4" />
                               <p className="text-lg font-medium text-slate-400">上传 .docx 文件以预览格式</p>
                             </div>
                          )}
                       </div>
                     ) : (
                       <Textarea 
                        className="flex-1 w-full h-full border-0 focus-visible:ring-0 resize-none p-10 text-base leading-relaxed font-mono rounded-none bg-transparent"
                        placeholder="请上传或粘贴您的论文正文..."
                        value={thesisText}
                        onChange={(e) => {
                          setThesisText(e.target.value);
                          setInputsChanged(true);
                        }}
                      />
                     )}

                  </div>
                </div>
                
                <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center rounded-b-xl z-20 relative">
                   <p className="text-xs text-slate-400 px-2 flex gap-4">
                     <span>字数统计: {getWordCount(thesisText)} 字符 (不含空格)</span>
                     {viewMode === 'preview' && <span className="text-blue-500 font-medium">预览模式</span>}
                     {analysisResult && (
                        <span className={cn(
                          "ml-2 flex items-center gap-1 font-semibold",
                          inputsChanged ? "text-amber-600" : "text-green-600"
                        )}>
                          {inputsChanged ? "• 内容已修改" : "• 报告已生成"}
                        </span>
                     )}
                   </p>
                   <Button 
                    onClick={handleAnalyze} 
                    disabled={(!thesisText.trim() && !thesisHtml) || (!formatRequirements.trim() && !formatFileBase64)} 
                    size="lg"
                    variant={analysisResult && !inputsChanged ? "outline" : "default"} // Switch style based on state
                    className={cn(
                      "pl-6 pr-6 shadow-lg transition-all duration-300",
                      analysisResult && !inputsChanged ? "border-slate-300 hover:border-slate-400 text-slate-700" : "shadow-slate-900/10"
                    )}
                  >
                    {analysisResult ? (
                      inputsChanged ? (
                        <>
                           <RefreshCw className="mr-2 h-4 w-4 animate-in spin-in-180" /> 重新分析文档
                        </>
                      ) : (
                        <>
                           <FileText className="mr-2 h-4 w-4" /> 查看现有报告
                        </>
                      )
                    ) : (
                      <>
                        开始格式分析 <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>

            </div>
          </div>
        )}

        {/* Loading States */}
        {(currentStep === AppStep.ANALYZING || currentStep === AppStep.FIXING) && (
          <div className="max-w-md mx-auto mt-24 text-center animate-in fade-in duration-500">
            <div className="flex flex-col items-center justify-center space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-slate-900" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  {currentStep === AppStep.ANALYZING ? '正在分析文档' : '正在润色文档'}
                </h2>
                <p className="text-slate-500">{loadingMessage}</p>
              </div>
              
              {/* Cancel Button - Only show during Analyzing step */}
              {currentStep === AppStep.ANALYZING && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelAnalysis}
                  className="mt-4 text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  中断分析
                </Button>
              )}
            </div>
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
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Alert className="bg-green-50 border-green-200 text-green-900 flex flex-col items-center text-center py-8">
                <div className="bg-green-100 p-3 rounded-full mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <AlertTitle className="text-xl mb-2 text-green-800">格式调整完成！</AlertTitle>
                <AlertDescription className="text-green-700 max-w-md mx-auto">
                  您的文档已根据提供的格式要求进行了标准化处理。
                </AlertDescription>
             </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium text-slate-500">原始文本</span>
                 </div>
                 <Card className="h-[600px] bg-slate-50/50">
                   <Textarea
                    readOnly
                    value={thesisText}
                    className="h-full border-0 focus-visible:ring-0 resize-none p-6 text-sm text-slate-500 font-mono bg-transparent"
                   />
                 </Card>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium text-slate-900">修复结果</span>
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-7 text-xs gap-1.5">
                      <Copy className="h-3 w-3" /> 复制内容
                    </Button>
                 </div>
                 <Card className="h-[600px] border-slate-300 shadow-md">
                   <Textarea
                    readOnly
                    value={fixedText}
                    className="h-full border-0 focus-visible:ring-0 resize-none p-6 text-sm text-slate-800 font-mono bg-transparent"
                   />
                 </Card>
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <Button variant="outline" size="lg" onClick={resetApp} className="gap-2">
                <RefreshCw className="h-4 w-4" /> 开始新的分析
              </Button>
            </div>
          </div>
        )}
      </main>
      <style>{`
        /* Styles for docx-preview rendering */
        .docx-viewer {
           /* No padding reset here, let wrapper handle it */
           width: 100%;
           height: 100%;
        }
        
        /* 
           Isolate docx-preview from Tailwind's base reset styles 
           Specifically target the container content to revert critical text styles
        */
        .docx-container-isolation .docx-viewer section,
        .docx-container-isolation .docx-viewer div,
        .docx-container-isolation .docx-viewer p,
        .docx-container-isolation .docx-viewer span {
           /* Attempt to revert Tailwind's aggressive line-height and font resets if docx-preview doesn't override them */
           text-align: initial;
        }

        /* Re-enable list styles which Tailwind often disables */
        .docx-container-isolation ul, 
        .docx-container-isolation ol {
           list-style: revert;
           margin: revert;
           padding: revert;
        }
        
        /* Fallback font mapping for Chinese environment simulation */
        /* docx-preview might generate inline styles like font-family: 'SimSun', but if not installed, we fallback */
        .docx-container-isolation {
           font-family: 'SimSun', 'Songti SC', 'STSong', 'Noto Serif SC', serif;
        }
      `}</style>
    </div>
  );
}