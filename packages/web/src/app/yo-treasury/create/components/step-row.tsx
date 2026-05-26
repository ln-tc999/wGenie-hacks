'use client';

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export type StepStatus = 'pending' | 'loading' | 'done' | 'error';

interface StepRowProps {
  number: number;
  label: string;
  status: StepStatus;
  detail?: string;
}

export function StepRow({ number, label, status, detail }: StepRowProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'done' ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
      ) : status === 'loading' ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
      ) : status === 'error' ? (
        <XCircle className="w-5 h-5 text-destructive shrink-0" />
      ) : (
        <span className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground shrink-0">
          {number}
        </span>
      )}
      <span
        className={`text-sm font-medium ${
          status === 'done'
            ? 'text-green-500'
            : status === 'error'
              ? 'text-destructive'
              : 'text-foreground'
        }`}
      >
        {label}
      </span>
      {detail && (
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
          — {detail}
        </span>
      )}
    </div>
  );
}
