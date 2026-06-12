import { Loader2 } from 'lucide-react';

export default function CfoLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#C5FF4A]" />
        <p className="text-sm text-[#8E8E8E]">Loading...</p>
      </div>
    </div>
  );
}
