'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Bell,
  BellOff,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Settings = {
  chat_id: string;
  display_name: string;
  notif_tx_executed: boolean;
  notif_guardrail: boolean;
  notif_strategy_change: boolean;
  notif_daily_report: boolean;
  daily_report_hour: number;
};

const DEFAULT: Settings = {
  chat_id: '',
  display_name: '',
  notif_tx_executed: true,
  notif_guardrail: true,
  notif_strategy_change: true,
  notif_daily_report: false,
  daily_report_hour: 8,
};

type TestStatus = 'idle' | 'loading' | 'success' | 'error';
type SaveStatus = 'idle' | 'loading' | 'success' | 'error';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="mt-0.5 text-xs text-[#8E8E8E]">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5FF4A] focus:ring-offset-2 focus:ring-offset-[#0D0D0D]',
          checked ? 'bg-[#C5FF4A]' : 'bg-[#262626]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-black transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

export function TelegramSettingsForm() {
  const { address, isConnected } = useAccount();
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');

  // Load existing settings
  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/settings/telegram?wallet=${address}`)
      .then((r) => r.json())
      .then(({ settings: s }) => {
        if (s) setSettings(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  }

  async function handleTest() {
    if (!settings.chat_id.trim()) return;
    setTestStatus('loading');
    setTestError('');
    try {
      const res = await fetch('/api/settings/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: settings.chat_id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setTestStatus('error');
        setTestError(json.error ?? 'Connection failed');
      } else {
        setTestStatus('success');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestError(e.message ?? 'Unknown error');
    }
  }

  async function handleSave() {
    if (!address || !settings.chat_id.trim()) return;
    setSaveStatus('loading');
    setSaveError('');
    try {
      const res = await fetch('/api/settings/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, ...settings }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSaveStatus('error');
        setSaveError(json.error ?? 'Save failed');
      } else {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (e: any) {
      setSaveStatus('error');
      setSaveError(e.message ?? 'Unknown error');
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center rounded border border-[#262626] bg-[#141414] p-12 text-sm text-[#8E8E8E]">
        Connect your wallet to manage Telegram settings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#8E8E8E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* How to get Chat ID */}
      <div className="flex gap-3 border border-[#262626] bg-[#141414] p-4 text-sm text-[#8E8E8E]">
        <Info className="mt-0.5 size-4 shrink-0 text-[#C5FF4A]" />
        <div>
          <p className="font-medium text-white">How to connect</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs">
            <li>Open Telegram and search <span className="font-mono text-white">@WalletGenieCFOBot</span></li>
            <li>Send <span className="font-mono text-white">/start</span> — the bot replies with your Chat ID</li>
            <li>Paste the Chat ID below and click <strong className="text-white">Test Connection</strong></li>
          </ol>
        </div>
      </div>

      {/* Connection */}
      <div className="border border-[#262626] bg-[#141414]">
        <div className="border-b border-[#262626] px-5 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Connection</h3>
        </div>
        <div className="space-y-4 p-5">
          {/* Chat ID */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
              Telegram Chat ID <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.chat_id}
                onChange={(e) => set('chat_id', e.target.value)}
                placeholder="e.g. 123456789"
                className="flex-1 border border-[#262626] bg-[#0D0D0D] px-3 py-2.5 text-sm text-white placeholder-[#4E4E4E] focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={!settings.chat_id.trim() || testStatus === 'loading'}
                className="flex items-center gap-2 border border-[#262626] bg-[#141414] px-4 py-2.5 text-xs font-bold text-[#8E8E8E] transition-colors hover:text-white disabled:opacity-40"
              >
                {testStatus === 'loading' ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : testStatus === 'success' ? (
                  <CheckCircle2 className="size-3.5 text-[#C5FF4A]" />
                ) : testStatus === 'error' ? (
                  <XCircle className="size-3.5 text-red-400" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {testStatus === 'success' ? 'Connected!' : testStatus === 'error' ? 'Failed' : 'Test'}
              </button>
            </div>
            {testStatus === 'error' && testError && (
              <p className="mt-1.5 text-xs text-red-400">{testError}</p>
            )}
            {testStatus === 'success' && (
              <p className="mt-1.5 text-xs text-[#C5FF4A]">Test message sent. Check your Telegram.</p>
            )}
          </div>

          {/* Display name */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
              Display name <span className="text-[#4E4E4E]">(optional)</span>
            </label>
            <input
              type="text"
              value={settings.display_name}
              onChange={(e) => set('display_name', e.target.value)}
              placeholder="e.g. My Treasury Alerts"
              className="w-full border border-[#262626] bg-[#0D0D0D] px-3 py-2.5 text-sm text-white placeholder-[#4E4E4E] focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="border border-[#262626] bg-[#141414]">
        <div className="border-b border-[#262626] px-5 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Notifications</h3>
        </div>
        <div className="divide-y divide-[#262626]">
          <div className="px-5 py-4">
            <Toggle
              checked={settings.notif_tx_executed}
              onChange={(v) => set('notif_tx_executed', v)}
              label="Transaction executed"
              description="Alert when AI agent executes a DeFi action on Mantle"
            />
          </div>
          <div className="px-5 py-4">
            <Toggle
              checked={settings.notif_guardrail}
              onChange={(v) => set('notif_guardrail', v)}
              label="Guardrail warning"
              description="Alert when daily limit is >80% used or a transaction is blocked"
            />
          </div>
          <div className="px-5 py-4">
            <Toggle
              checked={settings.notif_strategy_change}
              onChange={(v) => set('notif_strategy_change', v)}
              label="Strategy status change"
              description="Alert when a strategy is activated, paused, or deleted"
            />
          </div>
          <div className="px-5 py-4 space-y-3">
            <Toggle
              checked={settings.notif_daily_report}
              onChange={(v) => set('notif_daily_report', v)}
              label="Daily treasury report"
              description="Summary of treasury value, positions, and agent activity"
            />
            {settings.notif_daily_report && (
              <div className="flex items-center gap-3 pl-0">
                <label className="text-xs text-[#8E8E8E] shrink-0">Send at (UTC)</label>
                <select
                  value={settings.daily_report_hour}
                  onChange={(e) => set('daily_report_hour', Number(e.target.value))}
                  className="border border-[#262626] bg-[#0D0D0D] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00 UTC
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        <div>
          {saveStatus === 'error' && saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}
          {saveStatus === 'success' && (
            <p className="flex items-center gap-1.5 text-xs text-[#C5FF4A]">
              <CheckCircle2 className="size-3.5" /> Settings saved.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!settings.chat_id.trim() || saveStatus === 'loading'}
          className="flex items-center gap-2 bg-[#C5FF4A] px-5 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saveStatus === 'loading' && <Loader2 className="size-4 animate-spin" />}
          Save settings
        </button>
      </div>
    </div>
  );
}
