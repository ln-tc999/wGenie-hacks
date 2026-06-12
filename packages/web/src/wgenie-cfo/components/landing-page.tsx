import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  GitFork,
  Shield,
  Zap,
  TrendingUp,
} from 'lucide-react';

const VAULT_URL = '/vaults/5003/0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4';
const APP_URL = '/cfo';

const STATS = [
  { value: '$52.4K', label: 'Treasury managed' },
  { value: '6.8%', label: 'Blended APY' },
  { value: '3', label: 'Protocols' },
  { value: '1', label: 'Signature to execute' },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'One-sign batch execution',
    description:
      'Swap, deposit, and rebalance across Mantle vaults in a single atomic transaction. One signature, one gas payment — all succeeds or all reverts.',
  },
  {
    icon: Bot,
    title: 'AI copilot',
    description:
      'Describe the outcome in plain language. The agent encodes calldata, chains fuse actions, and returns a ready-to-sign proposal.',
  },
  {
    icon: GitFork,
    title: 'Simulated before signing',
    description:
      'Every transaction previews exact balance changes against live chain state before you commit. No surprises at signing time.',
  },
  {
    icon: Shield,
    title: 'Role-based security',
    description:
      'The agent never touches keys. Whitelisted actions, through whitelisted fuses, to whitelisted markets. You own the strategy.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Deploy your vault',
    description:
      'A guided wizard deploys your personal PlasmaVault on Mantle with roles, fuses, and market configs ready.',
  },
  {
    number: '02',
    title: 'Deposit USDC',
    description:
      'Fund the vault with a standard ERC-4626 deposit. Approve, deposit, and your capital is ready to allocate.',
  },
  {
    number: '03',
    title: 'Let the agent allocate',
    description:
      'Say “supply 500 USDC to Aave” or “swap 200 MNT to USDC.” The agent proposes, you confirm, it executes.',
  },
];

const STACK = [
  'NVIDIA Llama 3.3 70B',
  'Aave V3',
  'Merchant Moe',
  'Byreal CLMM',
  'Mantle Network',
  'Ponder Indexer',
  'wGenie Fusion SDK',
  'Next.js 16',
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="size-5 rounded-full bg-[#C5FF4A]" />
      <span className="text-lg font-bold tracking-tight text-white">
        WalletGenie
      </span>
    </div>
  );
}

export function WalletGenieLandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] font-sans text-white">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-50 border-b border-[#262626] bg-[#0D0D0D]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm text-[#8E8E8E] md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Product
            </a>
            <a href="#how" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#stack" className="transition-colors hover:text-white">
              Stack
            </a>
          </nav>
          <Link
            href={APP_URL}
            className="flex items-center gap-2 bg-[#C5FF4A] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Enter App
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border border-[#262626] bg-[#141414] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C5FF4A]">
              <Bot className="size-3" />
              Personal Web3 CFO · Mantle
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Run your treasury
              <br />
              in one sentence.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#8E8E8E]">
              WalletGenie is an AI agent that manages your on-chain treasury on
              Mantle — yield on Aave, liquidity on Merchant Moe, research on
              Byreal — through a single natural-language interface. You confirm,
              it executes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={VAULT_URL}
                className="flex items-center justify-center gap-2 bg-[#C5FF4A] px-6 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Enter Treasury
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={APP_URL}
                className="flex items-center justify-center gap-2 border border-[#262626] bg-[#141414] px-6 py-3 text-sm font-bold text-white transition-colors hover:border-[#C5FF4A]/40"
              >
                View live dashboard
              </Link>
            </div>
          </div>

          {/* Product preview — echoes the /cfo overview card */}
          <div className="border border-[#262626] bg-[#141414] p-4">
            <div className="bg-[linear-gradient(135deg,#C5FF4A_0%,#A3E635_100%)] p-6 text-black">
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold opacity-70">
                  Total Treasury Value
                </span>
                <span className="flex size-8 items-center justify-center rounded-full bg-black/10">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
              <p className="mt-6 text-4xl font-bold tracking-tight tabular-nums">
                $52,418.90
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4" />
                <span className="tabular-nums">+2.4%</span>
                <span className="opacity-60 tabular-nums">
                  +$1,228.40 · 24h
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-[#262626] border border-[#262626]">
              {[
                { k: 'Aave V3', v: '59.5%' },
                { k: 'Merchant Moe', v: '28.8%' },
                { k: 'Idle', v: '11.7%' },
              ].map((a) => (
                <div key={a.k} className="px-3 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
                    {a.k}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{a.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="border-y border-[#262626]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-[#262626] md:grid-cols-4 md:divide-x">
          {STATS.map((s) => (
            <div key={s.label} className="px-6 py-8">
              <p className="text-3xl font-bold tracking-tight tabular-nums text-[#C5FF4A]">
                {s.value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[#8E8E8E]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-12 max-w-xl">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E8E]">
            Engineered for Mantle
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Not a chatbot. An execution layer.
          </h2>
        </div>
        <div className="grid gap-px border border-[#262626] bg-[#262626] sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group bg-[#141414] p-8 transition-colors hover:bg-[#171717]"
            >
              <div className="mb-5 flex size-10 items-center justify-center bg-[#C5FF4A]/10 text-[#C5FF4A]">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8E8E8E]">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-t border-[#262626]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="mb-12 max-w-xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E8E]">
              From deposit to yield
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Three steps to an AI-managed treasury
            </h2>
          </div>
          <div className="grid gap-px border border-[#262626] bg-[#262626] md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.number} className="bg-[#0D0D0D] p-8">
                <p className="font-mono text-4xl font-bold tabular-nums text-[#C5FF4A]">
                  {s.number}
                </p>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8E8E8E]">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stack ── */}
      <section id="stack" className="border-t border-[#262626]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-xs text-2xl font-semibold tracking-tight md:text-3xl">
              Built on a serious stack.
            </h2>
            <div className="flex flex-wrap gap-2">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="border border-[#262626] bg-[#141414] px-4 py-2 text-sm text-[#8E8E8E] transition-colors hover:border-[#C5FF4A]/40 hover:text-white"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-[#262626]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center md:py-24">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Start managing your treasury.
            </h2>
            <p className="mt-4 max-w-lg text-[#8E8E8E]">
              One vault for every position. AI-proposed allocation, atomic batch
              execution, full on-chain transparency.
            </p>
          </div>
          <Link
            href={VAULT_URL}
            className="flex shrink-0 items-center gap-2 bg-[#C5FF4A] px-8 py-4 text-base font-bold text-black transition-opacity hover:opacity-90"
          >
            Open App
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#262626]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-[#8E8E8E] sm:flex-row">
          <BrandMark />
          <span>Built with wGenie Fusion SDK — deployed on Mantle</span>
        </div>
      </footer>
    </div>
  );
}
