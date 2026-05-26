'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useId, type ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SendHorizontal, Bot, User } from 'lucide-react';

export interface ToolPartProps {
  state: string;
  output?: unknown;
  chainId: number;
}

interface AgentChatProps {
  apiEndpoint: string;
  body?: Record<string, unknown>;
  chainId: number;
  toolRenderer: ComponentType<ToolPartProps>;
  emptyStateText?: string;
  placeholder?: string;
  className?: string;
}

export function AgentChat({
  apiEndpoint,
  body,
  chainId,
  toolRenderer: ToolRenderer,
  emptyStateText = 'Ask anything...',
  placeholder = 'Type a message...',
  className,
}: AgentChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  // Unique session ID per component mount — ensures fresh memory on page refresh
  const [sessionId] = useState(() => crypto.randomUUID());

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: apiEndpoint,
      body: { ...body, sessionId },
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue('');
  };

  return (
    <Card className={cn('flex flex-col h-[700px]', className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Bot className="w-8 h-8" />
            <p>{emptyStateText}</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 text-sm',
              message.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="max-w-[80%] space-y-2">
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  if (!part.text) return null;
                  return (
                    <div
                      key={index}
                      className={cn(
                        'rounded-lg px-3 py-2 whitespace-pre-wrap',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                      )}
                    >
                      {part.text}
                    </div>
                  );
                }

                if (part.type.startsWith('tool-')) {
                  return (
                    <ToolRenderer
                      key={index}
                      state={(part as { state: string }).state}
                      output={
                        'output' in part
                          ? (part as { output: unknown }).output
                          : undefined
                      }
                      chainId={chainId}
                    />
                  );
                }

                return null;
              })}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="text-sm text-destructive text-center">
            Something went wrong. Please try again.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleFormSubmit} className="border-t p-4 flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !inputValue.trim()}
        >
          <SendHorizontal className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
