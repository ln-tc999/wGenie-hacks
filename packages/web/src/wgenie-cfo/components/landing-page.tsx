'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  GitFork,
  Layers,
  Lock,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';

const VAULT_URL = '/vaults/5003/0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4';
const FEATURES = [
  {
    icon: Zap,
    title: 'One-Sign Batch Execution',
    description:
      'Swap, deposit, and rebalance across multiple Mantle vaults in a single atomic transaction. One signature, one gas payment — it either all succeeds or all reverts.',
  },
  {
    icon: Bot,
    title: 'AI Copilot',
    description:
      'Tell the agent what you want in natural language. It encodes the calldata, chains fuse actions, and presents a ready-to-sign proposal.',
  },
  {
    icon: GitFork,
    title: 'Fork Simulation',
    description:
      'Every transaction is simulated on a temporary blockchain fork before you sign. See exact balance changes — no surprises.',
  },
  {
    icon: Shield,
    title: 'Role-Based Security',
    description:
      'The AI never touches private keys. Only whitelisted actions through whitelisted fuses to whitelisted markets. You control the strategy.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Deploy Your Vault',
    description:
      'A guided 6-step wizard deploys your personal PlasmaVault on Mantle with all roles, fuses, and market configurations ready.',
  },
  {
    number: '02',
    title: 'Deposit USDC',
    description:
      'Fund your vault with a single deposit. Standard ERC-4626 flow — approve and deposit. Your capital is ready to allocate.',
  },
  {
    number: '03',
    title: 'Let AI Allocate',
    description:
      'Open the chat and say "Put 500 in USDY" or "Swap 200 to WETH and allocate to mETH." The agent handles the rest.',
  },
];

const VAULTS = [
  { name: 'USDY', asset: 'USDC', color: '#00FF8B' },
  { name: 'mETH', asset: 'WETH', color: '#D6FF34' },
  { name: 'cmBTC', asset: 'cbBTC', color: '#FFAF4F' },
  { name: 'MNT', asset: 'EURC', color: '#4E6FFF' },
];

export function YoLandingPage() {
  return (
    <div className="min-h-screen bg-wgenie-black font-sans text-white relative overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center">
        {/* Atmospheric glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          <img
            src="/assets/wgenie/wgenie_no_bg.svg"
            alt="wgenie"
            className="h-16 w-auto drop-shadow-[0_0_40px_rgba(214,255,52,0.3)]"
          />

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight leading-[1.1]">
            One Vault. One Deposit.{' '}
            <span className="text-primary">AI Handles the Rest.</span>
          </h1>

          <p className="text-base md:text-lg text-wgenie-muted max-w-xl leading-relaxed">
            DeFi yield is fragmented. Four vaults, four deposits, dozens of
            signatures. WalletGenie Treasury wraps all wgenie Protocol vaults into a single
            position — managed by an AI copilot with atomic batch execution.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link
              href={VAULT_URL}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-black font-semibold text-base hover:bg-primary/90 transition-colors"
            >
              Open App
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem → Solution ── */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16">
          <div className="space-y-4">
            <span className="text-[11px] font-medium tracking-wider uppercase text-wgenie-muted">
              The Problem
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Managing yield across multiple vaults is painful
            </h2>
            <ul className="space-y-3 text-wgenie-muted text-sm leading-relaxed">
              <li className="flex gap-3">
                <span className="text-white/30 shrink-0">—</span>
                Four separate deposit flows for USDY, mETH, cmBTC, MNT
              </li>
              <li className="flex gap-3">
                <span className="text-white/30 shrink-0">—</span>
                Manual token swaps between assets on DEXs
              </li>
              <li className="flex gap-3">
                <span className="text-white/30 shrink-0">—</span>
                Dozens of wallet signatures and gas payments
              </li>
              <li className="flex gap-3">
                <span className="text-white/30 shrink-0">—</span>
                No unified view of your positions and yield
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="text-[11px] font-medium tracking-wider uppercase text-primary">
              The Solution
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              One vault. AI copilot. Atomic execution.
            </h2>
            <ul className="space-y-3 text-wgenie-muted text-sm leading-relaxed">
              <li className="flex gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Deposit USDC once — AI allocates across all Mantle vaults
              </li>
              <li className="flex gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Cross-asset swaps and deposits batched into one transaction
              </li>
              <li className="flex gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                One signature for multi-vault rebalancing
              </li>
              <li className="flex gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Live dashboard with APR, TVL, and positions in one place
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative px-6 py-16 md:py-24">
        {/* Subtle glow */}
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-medium tracking-wider uppercase text-wgenie-muted">
              Key Features
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Built for serious capital
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative bg-wgenie-dark rounded-lg border border-white/5 p-6 space-y-3 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-primary/[0.02]" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-wgenie-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-medium tracking-wider uppercase text-wgenie-muted">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Three steps to unified yield
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-3">
                <span className="text-4xl font-semibold text-primary/20 font-mono">
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-wgenie-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture / Trust ── */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-medium tracking-wider uppercase text-wgenie-muted">
              Architecture
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Transparent. Non-custodial. On-chain.
            </h2>
          </div>

          {/* Architecture diagram */}
          <div className="bg-wgenie-dark rounded-lg border border-white/5 p-6 md:p-8 overflow-hidden">
            <div className="flex flex-col items-center gap-6 text-sm">
              {/* User deposit */}
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="font-medium">You deposit USDC</span>
              </div>

              <div className="w-px h-6 bg-white/10" />

              {/* Vault */}
              <div className="w-full max-w-md bg-wgenie-black/50 rounded-lg border border-primary/20 p-5 space-y-4">
                <div className="text-center font-semibold text-primary">
                  Your PlasmaVault (ERC-4626)
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="bg-white/5 rounded p-2">
                    <Layers className="w-4 h-4 mx-auto mb-1 text-wgenie-muted" />
                    Supply Fuses
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <Layers className="w-4 h-4 mx-auto mb-1 text-wgenie-muted" />
                    Redeem Fuses
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <Layers className="w-4 h-4 mx-auto mb-1 text-wgenie-muted" />
                    Swap Fuse
                  </div>
                </div>
              </div>

              <div className="w-px h-6 bg-white/10" />

              {/* Mantle Vaults */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md">
                {VAULTS.map((v) => (
                  <div
                    key={v.name}
                    className="bg-wgenie-black/50 rounded-lg border border-white/10 p-3 text-center"
                  >
                    <div
                      className="text-sm font-semibold"
                      style={{ color: v.color }}
                    >
                      {v.name}
                    </div>
                    <div className="text-[10px] text-wgenie-muted mt-0.5">
                      {v.asset}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security highlights */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-wgenie-dark rounded-lg border border-white/5 p-5 space-y-2">
              <Lock className="w-5 h-5 text-primary" />
              <h4 className="font-medium text-sm">No Private Key Access</h4>
              <p className="text-xs text-wgenie-muted leading-relaxed">
                The AI agent only produces transaction calldata. It never has
                access to your wallet or keys.
              </p>
            </div>
            <div className="bg-wgenie-dark rounded-lg border border-white/5 p-5 space-y-2">
              <Shield className="w-5 h-5 text-primary" />
              <h4 className="font-medium text-sm">Whitelisted Actions Only</h4>
              <p className="text-xs text-wgenie-muted leading-relaxed">
                The Alpha role can only execute through whitelisted fuses to
                whitelisted markets. No arbitrary contract calls.
              </p>
            </div>
            <div className="bg-wgenie-dark rounded-lg border border-white/5 p-5 space-y-2">
              <GitFork className="w-5 h-5 text-primary" />
              <h4 className="font-medium text-sm">Simulation Before Signing</h4>
              <p className="text-xs text-wgenie-muted leading-relaxed">
                Every transaction is simulated on a fork. You see exact balance
                changes before you sign anything.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Supported Vaults ── */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-medium tracking-wider uppercase text-wgenie-muted">
              Supported Vaults
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              All Mantle vaults, one position
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VAULTS.map((v) => (
              <div
                key={v.name}
                className="group relative bg-wgenie-dark rounded-lg border border-white/5 p-6 text-center space-y-2 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-primary/[0.02]" />
                <div className="relative z-10">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-3"
                    style={{ backgroundColor: v.color }}
                  />
                  <h3
                    className="text-xl font-semibold"
                    style={{ color: v.color }}
                  >
                    {v.name}
                  </h3>
                  <p className="text-xs text-wgenie-muted">{v.asset}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built With ── */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-medium tracking-wider uppercase text-wgenie-muted">
              Tech Stack
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Built with the best in DeFi
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              'wgenie Protocol SDK',
              'wGenie Fusion',
              'Mastra AI',
              'Mantle L2',
              'Next.js',
              'wagmi',
              'viem',
              'Merchant Moe',
              'ERC-4626',
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-wgenie-muted"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative px-6 py-20 md:py-28">
        <div className="absolute inset-0 bg-primary/[0.02]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
            Start managing your treasury
          </h2>
          <p className="text-wgenie-muted text-base md:text-lg max-w-lg mx-auto">
            One vault for all your wgenie positions. AI-managed allocation. Atomic
            batch execution. Full on-chain transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <Link
              href={VAULT_URL}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-black font-semibold text-base hover:bg-primary/90 transition-colors"
            >
              Open App
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-wgenie-muted">
          <div className="flex items-center gap-2">
            <img
              src="/assets/wgenie/wgenie_no_bg.svg"
              alt="wgenie"
              className="h-5 w-auto opacity-50"
            />
            <span>WalletGenie Treasury</span>
          </div>
          <span>
            Built with wgenie Protocol SDK & wGenie Fusion — Deployed on Mantle
          </span>
        </div>
      </footer>
    </div>
  );
}
