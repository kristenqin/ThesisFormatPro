import React from 'react';
import { AppStep } from '../types';
import { Check, FileText, ScanEye, Sparkles, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface StepIndicatorProps {
  currentStep: AppStep;
  onStepClick?: (step: AppStep) => void;
  maxReachedStep?: AppStep; // Optional: track how far the user has gone to allow jumping forward if applicable
}

const steps = [
  { id: AppStep.UPLOAD, label: '上传', icon: FileText },
  { id: AppStep.ANALYZING, label: '分析', icon: ScanEye },
  { id: AppStep.REPORT, label: '审查', icon: Check },
  { id: AppStep.FIXING, label: '修复', icon: Sparkles },
  { id: AppStep.RESULT, label: '结果', icon: Download },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  // Helper to determine if a step should be clickable
  // Logic: Allow clicking any step up to the current one, OR allow clicking UPLOAD anytime.
  const isClickable = (stepIndex: number, stepId: AppStep) => {
    if (!onStepClick) return false;
    // Always allow going back to Upload
    if (stepId === AppStep.UPLOAD) return true;
    // Allow going to Report if we are past it or on it (assuming checking existing report)
    // But simplistic view: allow clicking previous steps
    return stepIndex < currentIndex;
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-10 px-4">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center justify-between w-full relative">
          {/* Background Line */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-200 -z-10 -translate-y-1/2" />
          
          {/* Active Line (animated) */}
          <div 
            className="absolute top-1/2 left-0 h-[2px] bg-slate-900 -z-10 transition-all duration-500 ease-in-out -translate-y-1/2"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            const isPending = index > currentIndex;
            const clickable = isClickable(index, step.id);

            return (
              <li key={step.id} className="relative bg-white px-2">
                <button 
                  onClick={() => clickable && onStepClick?.(step.id)}
                  disabled={!clickable}
                  className={cn(
                    "flex flex-col items-center group focus:outline-none",
                    clickable ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div 
                    className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-all duration-300",
                      isCompleted && "border-slate-900 bg-slate-900 text-white",
                      isActive && "border-slate-900 bg-white ring-4 ring-slate-100 text-slate-900 scale-110",
                      isPending && "border-slate-200 bg-white text-slate-400",
                      clickable && !isActive && "group-hover:ring-2 group-hover:ring-slate-100 group-hover:border-slate-400"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span 
                    className={cn(
                      "absolute -bottom-7 text-xs font-medium whitespace-nowrap transition-colors duration-300",
                      isActive ? "text-slate-900" : "text-slate-500",
                      clickable && !isActive && "group-hover:text-slate-700"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};