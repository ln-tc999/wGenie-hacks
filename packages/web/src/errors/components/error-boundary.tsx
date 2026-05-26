import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Props {
  error: string;
  onRetry: () => void;
}

export const ErrorBoundary = ({ error, onRetry }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onRetry} className="w-full mt-4">
          Try Again
        </Button>
      </div>
    </div>
  );
};
