'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';

interface Props {
  timestamp: number;
}

export function RelativeDate({ timestamp }: Props) {
  const date = new Date(timestamp * 1000);
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = format(date, 'MMM d, yyyy h:mm a');

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default text-muted-foreground whitespace-nowrap">
        {relative}
      </TooltipTrigger>
      <TooltipContent>
        <p>{absolute}</p>
      </TooltipContent>
    </Tooltip>
  );
}
