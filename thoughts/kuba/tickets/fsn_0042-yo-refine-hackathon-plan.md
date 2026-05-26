# Refine Yo Hackathon Plan

I take part in Yo hackathon. I want to correct the plan before I start implementation.
I'm building to win the prize.

## Hackathon Resources

Read all hackathon resources: 

- hackathon page: https://dorahacks.io/hackathon/yo/detail
- outline: `thoughts/kuba/notes/yo-hackathon/hack-outline.md`
- announcement `thoughts/kuba/notes/yo-hackathon/announcement.md`

## YO resources

- YO protocol breakdown: `thoughts/kuba/notes/yo-hackathon/protocol-breakdown`
- YO protocol smart contracts in git submodule: `external/core` 
- YO docs: https://docs.yo.xyz/
- skills:
  - .claude/skills/yo-protocol-cli/SKILL.md
  - .claude/skills/yo-protocol-sdk/SKILL.md
- Plan: `thoughts/kuba/notes/yo-hackathon/project-plan`

## YO webapp 

- Explore Yo web app using Playwright MCP https://app.yo.xyz/

## Other Instructions

- Read all the staged changes I made, analyze it and reflect in other spots in the plan
- spawn multiple agents to make deep research on all fields

## Goal

Correct existing plan according my comments below.

### Treasury vault interface

Current:

```
Is managed through an **AI copilot** that reads positions, suggests allocations, simulates outcomes, and prepares transactions
```

Actual:

- Ensure that user always sees their allocations with no need to chat with AI
- AI chat interface is meant mostly to execute transactions, however it should support that too, don't exlude that feature from chat agent
- Apart of that user should always be able to lookup into portfolio dashboard with all balances, APRs, charts etc with fixed UI visible in vault overview page

Update all affected spots accross the plans.
I first place user should see normal web UI with all holdings.
Chat UI is secondary but stil significant for the product.
Make user feel save always seeing their holdings.

### Testing

We should always test before marking anything as done.
Test onchain transactions on fork using hatdhat, fix for a block - look for reference in other package
For web UI use Playwright MCP.
You can test in Mastra Studio (development) and in webapp
You can test mastra agents in terminal and also by creating test scripts.
We should maintain test suits for regression protection, care about good coverage.
You can create test slash commands (prompts) for non deterministic tests.

### Don't make treasury vault (Plasma Vault) public

Current:

```
Vault is converted to public (anyone can deposit — simplifies UX)
```

Actual

Don't turn Plasma Vault into public. It's irreversable.
Grant user wallet address deposit whitelist role.

### First action after vault creation

Current:

```
If vault exists, skip creation and go straight to chat
```

Actual:

Alway ensure if used made first deposit, otherwise there is nothing to manage.

### Deposit and withdraw UI

In `US-2.3: Deposit Into Treasury` and `US-2.7: Withdraw from Treasury` user should use normal web UI.
Chat agent is supposed to not support that - AI chat is alpha only.

### Treasury asset

Treasury asset should always be a stable coin USDC.

### Fork tests

In development and tests we always base on fork tests.
Actual transactions only in webapp as we have access to alpha account only in the browser.
We can also use private key connector - only in separation like in Playwright.
Private key should NEVER touch production code.

### Exclude yield projection

This is out of scope: `US-2.8: Yield Projection`.
Never project future yield.
Only display APRs.

### Agregators

Current: Odos/KyberSwap
Actuall Odos/KyberSwap and Velora (Paraswap)

### Look for features in Fusion and YO SDKs

- Before you implement any custom function by yourslef, look into Fusion and Yo SDKs if such one already exists.
- For example: addressToSubstrate

### UI implementation is last

When implementing a feature don't start with UI.
Start with bare code, ensure it it works with automated tests.
Then move to higher abstractions.
In the end create UI and test integration then.
Data driven approach.
Test drivvent development if possible - use skill `test-driven-development`.

### Skills

In development use skills:
- fuse-explorer - to find right fuses code
- mastra - to know how to use mastra 
- vercel-react-best-practices
- web-design-guidelines
- web3-data-fetching - to learn how to fetch data in complex workflows
- yo-protocol-cli
- yo-protocol-sdk

### Adaptive approach

Include in the plan addaptive apprach.
Claim that plan may change during the implementation.
We start with some basics.
If we discover that our initial assumptions were wrong, then change the plan.
Directory `thoughts/kuba/notes/yo-hackathon/project-plan` contains high overview plan.
We will create detailed tickets when we refine this plan.
We will create tickets for very next steps.
We won't create detailed plans for far future tickets.
We will plan for current step and execute, then next.


