'use client';

import { useState } from 'react';
import { X, Target, Clock, Trash2, Pencil, Check, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Strategy } from './mock-data';

type Props = {
  strategy: Strategy | null;
  onClose: () => void;
  onUpdate: (updated: Strategy) => void;
  onDelete: (name: string) => void;
};

const STATUS_STYLE: Record<Strategy['status'], string> = {
  Active: 'bg-[#C5FF4A]/10 text-[#C5FF4A]',
  Paused: 'bg-[#8E8E8E]/10 text-[#8E8E8E]',
  Draft: 'bg-[#3B5BDB]/10 text-[#3B5BDB]',
};

const STATUS_ICON: Record<Strategy['status'], React.ReactNode> = {
  Active: <Play className="size-3" />,
  Paused: <Pause className="size-3" />,
  Draft: <Pencil className="size-3" />,
};

const CADENCE_OPTIONS = [
  'Rebalance daily',
  'Rebalance weekly',
  'Rebalance monthly',
  'Rebalance on +5% MNT dip',
  'Manual approval',
];

export function StrategyDetailModal({ strategy, onClose, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetApy, setTargetApy] = useState('');
  const [allocation, setAllocation] = useState('');
  const [cadence, setCadence] = useState('');
  const [status, setStatus] = useState<Strategy['status']>('Draft');

  if (!strategy) return null;

  function openEdit() {
    setName(strategy!.name);
    setDescription(strategy!.description);
    setTargetApy(strategy!.targetApyLabel === '—' ? '' : strategy!.targetApyLabel.replace('%', ''));
    setAllocation(strategy!.allocationLabel.replace(/[$,]/g, ''));
    setCadence(strategy!.cadence);
    setStatus(strategy!.status);
    setEditing(true);
    setConfirmDelete(false);
  }

  function handleSaveEdit() {
    if (!name.trim() || !description.trim()) return;
    const apyNum = parseFloat(targetApy);
    const allocNum = parseFloat(allocation.replace(/[$,]/g, ''));
    onUpdate({
      name: name.trim(),
      description: description.trim(),
      status,
      targetApyLabel: targetApy && !isNaN(apyNum) ? `${apyNum.toFixed(1)}%` : '—',
      allocationLabel: allocation && !isNaN(allocNum) ? `$${allocNum.toLocaleString('en-US')}` : '$0',
      cadence,
    });
    setEditing(false);
    onClose();
  }

  function handleStatusToggle() {
    if (!strategy) return;
    const next: Strategy['status'] =
      strategy.status === 'Active' ? 'Paused' : strategy.status === 'Paused' ? 'Active' : 'Active';
    onUpdate({ ...strategy, status: next });
    onClose();
  }

  function handleDelete() {
    if (!strategy) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(strategy.name);
    onClose();
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) { setEditing(false); setConfirmDelete(false); onClose(); }
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
              Strategy Detail
            </h2>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(false); setConfirmDelete(false); onClose(); }}
            className="text-[#8E8E8E] transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {!editing ? (
            /* ── View mode ── */
            <div className="space-y-5">
              {/* Name + status */}
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                <span className={cn(
                  'flex shrink-0 items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  STATUS_STYLE[strategy.status],
                )}>
                  {STATUS_ICON[strategy.status]}
                  {strategy.status}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-[#8E8E8E]">{strategy.description}</p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-px border border-[#262626] bg-[#262626]">
                <div className="bg-[#141414] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#8E8E8E]">Target APY</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#C5FF4A]">{strategy.targetApyLabel}</p>
                </div>
                <div className="bg-[#141414] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#8E8E8E]">Allocated</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">{strategy.allocationLabel}</p>
                </div>
              </div>

              {/* Cadence */}
              <div className="flex items-center gap-2 rounded border border-[#262626] bg-[#141414] px-4 py-3 text-sm text-[#8E8E8E]">
                <Clock className="size-4 shrink-0" />
                <span>{strategy.cadence}</span>
              </div>

              {/* Note for Draft */}
              {strategy.status === 'Draft' && (
                <p className="text-xs text-[#8E8E8E]">
                  This strategy is a draft. Activate it to allow the AI agent to propose actions.
                </p>
              )}
            </div>
          ) : (
            /* ── Edit mode ── */
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-[#262626] bg-[#141414] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none border border-[#262626] bg-[#141414] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">Target APY (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetApy}
                    onChange={(e) => setTargetApy(e.target.value)}
                    className="w-full border border-[#262626] bg-[#141414] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">Allocation (USD)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={allocation}
                    onChange={(e) => setAllocation(e.target.value)}
                    className="w-full border border-[#262626] bg-[#141414] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">Cadence</label>
                  <select
                    value={cadence}
                    onChange={(e) => setCadence(e.target.value)}
                    className="w-full border border-[#262626] bg-[#141414] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C5FF4A]"
                  >
                    {CADENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">Status</label>
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#262626] px-6 py-4">
          {/* Left — delete */}
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors',
              confirmDelete
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'text-[#8E8E8E] hover:text-red-400',
            )}
          >
            <Trash2 className="size-3.5" />
            {confirmDelete ? 'Confirm delete?' : 'Delete'}
          </button>

          {/* Right — actions */}
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                {/* Toggle active/paused */}
                {strategy.status !== 'Draft' && (
                  <button
                    type="button"
                    onClick={handleStatusToggle}
                    className="border border-[#262626] bg-[#141414] px-4 py-2 text-xs font-bold text-[#8E8E8E] transition-colors hover:text-white"
                  >
                    {strategy.status === 'Active' ? 'Pause' : 'Activate'}
                  </button>
                )}
                {strategy.status === 'Draft' && (
                  <button
                    type="button"
                    onClick={handleStatusToggle}
                    className="border border-[#C5FF4A]/30 bg-[#C5FF4A]/10 px-4 py-2 text-xs font-bold text-[#C5FF4A] transition-colors hover:bg-[#C5FF4A]/20"
                  >
                    Activate
                  </button>
                )}
                <button
                  type="button"
                  onClick={openEdit}
                  className="flex items-center gap-1.5 bg-[#C5FF4A] px-4 py-2 text-xs font-bold text-black transition-opacity hover:opacity-90"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="border border-[#262626] bg-[#141414] px-4 py-2 text-xs font-bold text-[#8E8E8E] transition-colors hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 bg-[#C5FF4A] px-4 py-2 text-xs font-bold text-black transition-opacity hover:opacity-90"
                >
                  <Check className="size-3" />
                  Save changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
