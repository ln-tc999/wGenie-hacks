'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { Bot, SendHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TreasuryToolRenderer } from '@/wgenie-cfo/tools/tool-renderer';
import { TREASURY } from './mock-data';

/**
 * Full-page agent chat, wired to the live CFO route.
 *
 * Streams from `/api/cfo/treasury/chat` (NVIDIA Llama 3.3 + on-chain tools).
 * Text parts render as bubbles; `tool-*` parts render through the shared
 * TreasuryToolRenderer (e.g. confirmable `treasury-transaction-proposal`).
 *
 * Requires server env: NVIDIA_API_KEY, MANTLE_SEPOLIA_RPC_URL (+ MANTLE_RPC_URL
 * for mainnet). Without them the route streams an error, surfaced below.
 */

const SUGGESTIONS = [
  'Check my treasury balance',
  'What is USDC APY on Aave?',
  'Supply 1,000 USDC to Aave V3',
  'Show top Byreal pools',
];

export function AgentChatView() {
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/cfo/treasury/chat',
      body: {
        vaultAddress: TREASURY.address,
        chainId: TREASURY.chainId,
        sessionId,
      },
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const waitingFirstToken =
    status === 'submitted' ||
    (isLoading && messages.at(-1)?.role === 'user');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  function send(text: string) {
    const value = text.trim();
    if (!value || isLoading) return;
    sendMessage({ text: value });
    setInput('');
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          {messages.length === 0 && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C5FF4A]/10 text-[#C5FF4A]">
                <Bot className="size-4" />
              </div>
              <div className="max-w-[80%] border border-[#262626] bg-[#141414] px-4 py-3 text-sm leading-relaxed text-white/90">
                I&apos;m your treasury agent. Ask me to check balances, compare
                yields, or build an allocation — I&apos;ll prepare a proposal you
                confirm before anything executes.
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] bg-[#C5FF4A] px-4 py-2.5 text-sm font-medium text-black">
                  {message.parts.map((part, i) =>
                    part.type === 'text' ? <span key={i}>{part.text}</span> : null,
                  )}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C5FF4A]/10 text-[#C5FF4A]">
                  <Bot className="size-4" />
                </div>
                <div className="max-w-[80%] space-y-3">
                  {message.parts.map((part, i) => {
                    if (part.type === 'text') {
                      if (!part.text) return null;
                      return (
                        <div
                          key={i}
                          className="whitespace-pre-wrap border border-[#262626] bg-[#141414] px-4 py-3 text-sm leading-relaxed text-white/90"
                        >
                          {part.text}
                        </div>
                      );
                    }
                    if (part.type.startsWith('tool-')) {
                      return (
                        <TreasuryToolRenderer
                          key={i}
                          state={(part as { state: string }).state}
                          output={
                            'output' in part
                              ? (part as { output: unknown }).output
                              : undefined
                          }
                          chainId={TREASURY.chainId}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ),
          )}

          {waitingFirstToken && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C5FF4A]/10 text-[#C5FF4A]">
                <Bot className="size-4" />
              </div>
              <div className="flex items-center gap-1 border border-[#262626] bg-[#141414] px-4 py-3">
                <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
              </div>
            </div>
          )}

          {error && (
            <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              The agent couldn&apos;t respond. Check that{' '}
              <span className="font-mono">NVIDIA_API_KEY</span> and the Mantle
              RPC env are set, then try again.
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-[#262626] bg-[#0D0D0D]">
        <div className="mx-auto max-w-3xl space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={isLoading}
                className="flex items-center gap-1.5 border border-[#262626] bg-[#141414] px-3 py-1.5 text-xs text-[#8E8E8E] transition-colors hover:border-[#C5FF4A]/40 hover:text-white disabled:opacity-40"
              >
                <Sparkles className="size-3 text-[#C5FF4A]" />
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border border-[#262626] bg-[#141414] p-2 focus-within:border-[#C5FF4A]/40"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the treasury agent…"
              className="flex-1 bg-transparent px-2 text-sm text-white placeholder-[#8E8E8E] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send"
              className="flex size-9 items-center justify-center bg-[#C5FF4A] text-black transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              <SendHorizontal className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-[#8E8E8E]"
      style={{ animationDelay: delay }}
    />
  );
}
