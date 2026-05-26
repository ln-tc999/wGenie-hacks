# FSN-0089 — Refine Demo Voiceover Script for ElevenLabs v3

## Overview

Rewrite the YO Treasury demo voiceover script optimized for ElevenLabs v3 synthesis. Target audience: asset managers. Tone: technical presentation — features and benefits, no salesmanship. ~500 words / 3 minutes.

## Key Changes from Current Script

1. **Reordered** — AI agent demo comes first (funds already deposited), dashboard shown after as the result
2. **Simplified language** — No internal contract method names. Use terms like "fuse", "Fusion vault", "YO Treasury"
3. **Added v3 audio tags** — `[professional]`, `[confident]`, `[short pause]` for corporate delivery
4. **Vault creation wizard moved to closing** — brief mention, not a full section
5. **Focus keywords** — One-Sign Batch Execution, AI Copilot, Fork Simulation, Role-Based Security, Transparent, Non-custodial, On-chain

## Desired End State

`thoughts/kuba/notes/yo-hackathon/video-voiceover-script.md` contains the refined script below, ready to paste into ElevenLabs v3.

## The Script

See Phase 1 below — the script IS the deliverable.

---

## Phase 1: Write the Refined Script

### File: `thoughts/kuba/notes/yo-hackathon/video-voiceover-script.md`

Replace entirely with:

```markdown
# YO Treasury — Demo Video Voiceover Script

**Duration:** 3 minutes
**Voice:** Professional, neutral, corporate finance
**ElevenLabs:** v3, stability Natural or Robust
**Audience:** Asset managers, DeFi-native teams

---

## [0:00–0:15] Opening — The Problem

[professional] DeFi yield is fragmented. Exposure to yoUSD, yoETH, yoBTC, and yoEUR means four separate deposit flows... manual swaps between assets... and dozens of wallet signatures.

YO Treasury consolidates this into a single on-chain vault, managed through conversation.

---

## [0:15–0:40] What Is YO Treasury

[professional] YO Treasury is a non-custodial Fusion vault on Base that wraps all four YO Protocol vaults into one position.

You deposit USDC once. An AI copilot allocates capital across YO vaults — handling swaps, deposits, and withdrawals as atomic batch transactions. One signature per operation.

[short pause] The vault is yours. You hold all roles, you control the strategy. The AI produces transaction calldata — nothing more.

Let me show you how it works.

---

## [0:40–1:10] AI Copilot — Direct Allocation

[professional] This is the chat interface. I tell the agent: "Put 30 USDC into yoUSD."

[short pause] The agent reads the treasury balance, encodes the deposit through the supply fuse, and runs a fork simulation. Here — before and after balances. USDC down, yoUSD shares up. Exact amounts, verified on a fork before anything touches the chain.

[confident] I click Execute. One transaction. One signature. Done.

---

## [1:10–1:45] AI Copilot — Swap and Batch Execute

[professional] Now a cross-asset allocation. "Swap 50 USDC to WETH and allocate to yoETH."

The agent fetches a DEX quote, encodes the swap, then chains a yoETH deposit — two fuse actions batched into a single transaction. [short pause] The fork simulation runs both actions atomically. If either fails, both revert. No leftover tokens, no partial states.

[confident] One signature. The swap and the deposit execute together on-chain.

[short pause] Same pattern for any combination. The agent handles the encoding... you approve the result.

---

## [1:45–2:00] AI Copilot — Withdraw

[professional] Withdrawals follow the same flow. "Withdraw everything from yoBTC."

The agent encodes a redeem action, simulates on fork, presents the proposal. [short pause] Execute. Funds return to the treasury as unallocated balance.

---

## [2:00–2:20] Dashboard — Portfolio Transparency

[professional] The dashboard shows the full portfolio state without any AI interaction. Total value... per-vault allocations with live APR from the YO Protocol API... TVL, share prices, and active status for each position.

[short pause] All data reads directly from the blockchain via multicall. No off-chain database for position tracking. Fully transparent and verifiable.

---

## [2:20–2:40] Security Model

[confident] Security is architectural. The AI agent never has access to private keys — it only produces calldata. The execution role can only operate through whitelisted fuses to whitelisted markets. No arbitrary contract calls. No token transfers to unknown addresses.

[short pause] And every transaction is fork-simulated before you sign. You see exactly what will change... before it changes.

---

## [2:40–3:00] Closing — Create Your Own Vault

[professional] YO Treasury. One vault for all your YO positions. AI-managed allocation. Atomic batch execution. Non-custodial and fully on-chain.

[short pause] And this isn't limited to one deployment. Anyone can create their own Treasury vault through the creation wizard — a guided flow that deploys a Fusion vault from the factory contract, configures roles, installs fuses, and sets permissions. Your vault, your rules.

Built with the YO SDK... wGenie Fusion... and live on Base.

---

## Production Notes

- **Word count:** ~480 words → ~3 min at 150 wpm with pauses for screen transitions
- **ElevenLabs v3 settings:** Use a neutral professional voice from the v3 collection. Stability: Natural. Avoid Creative (too expressive for corporate tone)
- **Audio tags used:** `[professional]`, `[confident]`, `[short pause]` — minimal, consistent with corporate delivery. Avoid emotional tags
- **Screen recording sync points:**
  - 0:40 — Open chat interface, type allocation command
  - 1:10 — Type swap+allocate command, show simulation diff
  - 1:45 — Type withdraw command
  - 2:00 — Switch to dashboard view
  - 2:20 — Show role badges or fuse configuration
  - 2:40 — Final dashboard shot with all 4 vaults active
```

### Success Criteria

#### Automated Verification:
- [ ] File exists at `thoughts/kuba/notes/yo-hackathon/video-voiceover-script.md`
- [ ] Word count is 450–550 words (target 3 min at ~150 wpm)

#### Manual Verification:
- [ ] Script reads naturally when spoken aloud
- [ ] Audio tags produce correct delivery in ElevenLabs v3
- [ ] Timing matches screen recording segments
- [ ] Tone is corporate/technical, not salesy

## References

- Ticket: `thoughts/kuba/tickets/fsn_0089-refine-demo-voiceover-script-for-elevenlabs-v3.md`
- ElevenLabs v3 guide: `thoughts/kuba/notes/yo-hackathon/prompting-eleven-labs.md`
- Project spec: `thoughts/kuba/notes/yo-hackathon/project-details.md`
