---
name: mantle-ux-designer
description: Expert UI/UX designer for the Mantle ecosystem and WalletGenie. Use when Gemini CLI needs to design, implement, or polish frontend components using React 19, TailwindCSS 4, and Shadcn/ui.
---

# Mantle UX Designer

Crafting premium, agentic interfaces for the Mantle network.

## Documentation
- **UI Guidelines**: See [guidelines.md](references/guidelines.md) for brand identity and patterns.

## Implementation Checklist
1. Use Mantle Green (`#00FF8B`) for primary actions.
2. Ensure high contrast for readability in dark mode.
3. Add tooltips for complex DeFi terms.
4. Implement skeleton loaders for all async data fetching.
5. Use `recharts` for treasury growth and allocation visualization.

## Component Patterns
- **TreasuryOverview**: Main dashboard container.
- **PortfolioSummary**: Stat cards for total value/allocated/unallocated.
- **AllocationTable**: Detailed list of vaults and yields.
- **TransactionProposal**: The bridge between AI logic and on-chain execution.
