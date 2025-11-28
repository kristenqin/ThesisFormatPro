import React from 'react';
import { AppStep } from '../types';
import { Check, FileText, ScanEye, Sparkles, Download } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.UPLOAD, label: '上传', icon: FileText },
  { id: AppStep.ANALYZING, label: '分析', icon: ScanEye },
  { id: AppStep.REPORT, label: '审查', icon: Check },
  { id: AppStep.FIXING, label: '修复', icon: Sparkles },
  { id: AppStep.RESULT, label: '结果', icon: Download },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4">
      <div className="relative flex justify-between items-center">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
        
        {/* Progress Bar Fill */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-indigo-600 -z-10 transition-all duration-500 rounded-full"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center group">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isActive || isCompleted 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-110' 
                    : 'bg-white border-slate-300 text-slate-400'}
                `}
              >
                <Icon size={18} />
              </div>
              <span 
                className={`
                  mt-2 text-xs font-medium tracking-wider transition-colors duration-300
                  ${isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};