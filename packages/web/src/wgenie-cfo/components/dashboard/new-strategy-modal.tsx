'use client';

import { useState } from 'react';
import { X, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Strategy } from './mock-data';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (strategy: Strategy) => void;
};

const CADENCE_OPTIONS = [
  'Rebalance daily',
  'Rebalance weekly',
  'Rebalance monthly',
  'Rebalance on +5% MNT dip',
  'Manual approval',
];

const PROTOCOL_TEMPLATES = [
  { label: 'Aave V3 USDC', value: 'Aave V3 USDC supply for stable yield.' },
  { label: 'Merchant Moe LP', value: 'MNT-USDC liquidity pool on Merchant Moe.' },
  { label: 'Byreal CLMM', value: 'Move idle balance into top Byreal CLMM pool by fee APR.' },
  { label: 'Custom', value: '' },
];

export function NewStrategyModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetApy, setTargetApy] = useState('');
  const [allocation, setAllocation] = useState('');
  const [cadence, setCadence] = useState(CADENCE_OPTIONS[1]);
  const [status, setStatus] = useState<Strategy['status']>('Draft');
  const [template, setTemplate] = useState('Custom');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Strategy name is required.';
    if (!description.trim()) e.description = 'Description is required.';
    if (targetApy && isNaN(parseFloat(targetApy))) e.targetApy = 'Must be a number.';
    if (allocation && isNaN(parseFloat(allocation.replace(/[$,]/g, '')))) e.allocation = 'Must be a number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleTemplateChange(label: string) {
    setTemplate(label);
    const found = PROTOCOL_TEMPLATES.find((t) => t.label === label);
    if (found && found.value) setDescription(found.value);
  }

  function handleSave() {
    if (!validate()) return;
    const apyNum = parseFloat(targetApy);
    const allocNum = parseFloat(allocation.replace(/[$,]/g, ''));
    onSave({
      name: name.trim(),
      description: description.trim(),
      status,
      targetApyLabel: targetApy ? `${apyNum.toFixed(1)}%` : '—',
      allocationLabel: allocation ? `$${allocNum.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '$0',
      cadence,
    });
    // reset
    setName('');
    setDescription('');
    setTargetApy('');
    setAllocation('');
    setCadence(CADENCE_OPTIONS[1]);
    setStatus('Draft');
    setTemplate('Custom');
    setErrors({});
    onClose();
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-lg border border-[#262626] bg-[#0D0D0D] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] px-6 py-4">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-[#C5FF4A]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              New Strategy
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8E8E8E] transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Template picker */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
              Start from template
            </label>
            <div className="flex flex-wrap gap-2">
              {PROTOCOL_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => handleTemplateChange(t.label)}
                  className={cn(
                    'border px-3 py-1.5 text-xs font-bold transition-colors',
                    template === t.label
                      ? 'border-[#C5FF4A]/40 bg-[#C5FF4A]/10 text-[#C5FF4A]'
                      : 'border-[#262626] bg-[#141414] text-[#8E8E8E] hover:text-white',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
              Strategy name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Conservative Yield"
              className={cn(
                'w-full border bg-[#141414] px-3 py-2.5 text-sm text-white placeholder-[#4E4E4E] focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]',
                errors.name ? 'border-red-500' : 'border-[#262626]',
              )}
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how this strategy allocates and rebalances..."
              className={cn(
                'w-full resize-none border bg-[#141414] px-3 py-2.5 text-sm text-white placeholder-[#4E4E4E] focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]',
                errors.description ? 'border-red-500' : 'border-[#262626]',
              )}
            />
            {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
          </div>

          {/* APY + Allocation row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
                Target APY (%)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={targetApy}
                onChange={(e) => setTargetApy(e.target.value)}
                placeholder="e.g. 6.8"
                className={cn(
                  'w-full border bg-[#141414] px-3 py-2.5 text-sm text-white placeholder-[#4E4E4E] focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]',
                  errors.targetApy ? 'border-red-500' : 'border-[#262626]',
                )}
              />
              {errors.targetApy && <p className="mt-1 text-xs text-red-400">{errors.targetApy}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
                Allocation (USD)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
                placeholder="e.g. 10000"
                className={cn(
                  'w-full border bg-[#141414] px-3 py-2.5 text-sm text-white placeholder-[#4E4E4E] focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]',
                  errors.allocation ? 'border-red-500' : 'border-[#262626]',
                )}
              />
              {errors.allocation && <p className="mt-1 text-xs text-red-400">{errors.allocation}</p>}
            </div>
          </div>

          {/* Cadence + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
                Cadence
              </label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full border border-[#262626] bg-[#141414] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
              >
                {CADENCE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Strategy['status'])}
                className="w-full border border-[#262626] bg-[#141414] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#262626] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#262626] bg-[#141414] px-4 py-2 text-sm font-bold text-[#8E8E8E] transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-[#C5FF4A] px-5 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Save Strategy
          </button>
        </div>
      </div>
    </div>
  );
}
