# Prepare for submission - create docs and spec

## Task

You are tasked to create:

- Project details - large text block, markdown
  - That should be detailed spec/pitch of YO Treasury app - this project
  - Vision: describe the problem which this project solves
  - One vault for all YO positions securely managed by AI agent.
  - Single markdown file which I'll upload to hackathon platform attached to the project
- Script for video presentation voice over
  - Demo video on Youtube 3 min

## Overview

- App build on top Fusion vaults
- Treasury vault (fusion) contributes to yo vaults
- AI agent transalates human to transactions
- Transactions calldata is created from deterministic code-based tools
- Alpha executes all transactions in batch - one sign to run conplex sequences instead of atomic actions like withdraw, swap seposit - all in one go
- Simulation runs before each propposal to present before/after state for whole transaction batch

## Features

- rebalancing with one transaction (one sign) - no approvals or moddle step transactions in complex rebalancing
- Strategy and Execution are apart - 2 separate roles - Atomist and Alpha
  - Alpha role executes transactions
  - Atomist set up the strategy - possible actions
- Secure transaction execution - alpha can only perform whitelisted actions (fuses) to whitelisted markets with whitelisted assets (substrates)
- Modularity, Atomists can extend, reduce allowed operations, can add new markets in the future
  - plug and play fuses for reading balances and execution transactions
  - transparent price feeds for erc20 tokens, editiable, provides fair share pricing
- Vaults implement ERC4626 standard 
- Whitelisted shareholders - depositors
- Agent doesn't have access to private key
  - agent only produces calldata
  - user with alpha role executes transaction on frontend with injected wallet like Metamask or Rabby
  - potentially anybody can run agent to produce output, only alpha can execute

## User stories

- Treasury Vault Creation from Fusion factory - vault wizard
  - create, vaults, configure fuses, grant roles
- Deposit USDC to Treasury vault
- Prompt Yo Treasury agent to execute transaction - deposits to yo vaults, withdrawals, swaps
- Exploring Treasury and child yo vaults statistics, onchain data, performance, depositors, trends

## Other

- YO SDK Integration - where and how it's used
- What features are regarding Risk & Transparency
- Custom fuses deployed
- Started with POC - hardhat tests flow executed against fork chain

## Architecture

- Nextjs webapp on vercel
- Supabase for poder events
- Mastra for AI agents
