'use client';

import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface Step {
  key: string;
  label: string;
}

interface Props {
  steps: Step[];
  currentStep: string;
  isError?: boolean;
}

export function StepProgress({ steps, currentStep, isError }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-1.5 flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && !isError && 'bg-primary/20 text-primary ring-1 ring-primary',
                  isActive && isError && 'bg-destructive/20 text-destructive ring-1 ring-destructive',
                  isPending && 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : isActive && !isError ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight text-center',
                  isCompleted && 'text-primary',
                  isActive && !isError && 'text-foreground',
                  isActive && isError && 'text-destructive',
                  isPending && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mt-[-14px]',
                  isCompleted ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
