# Refine YO hackaton implementation step

- Read staged files
- Read last plan
- Read all plan files in `thoughts/kuba/notes/yo-hackathon/project-plan`
- Focus on POC tests: packages/hardhat-tests/test/yo-treasury/create-vault.ts
- Spawn an agent team to explore from different angles

## Task

This code is not perfect. I want to refine current changes.

- pendingActionSchema seems to be redundant, isn't it?
- Why we can't keep this?
```
protocol: z.enum(['aave-v3', 'morpho', 'euler-v2']),
actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']),
```
- Read:
```
Yo, devs and hackathon participants! 👋

The team just released new versions of the NPM packages:

@yo
-protocol/core – v1.0.4
https://npmjs.com/package/@yo-protocol/core

@yo
-protocol/react – v1.0.4
https://npmjs.com/package/@yo-protocol/react

Working with the packages is now much simpler and more streamlined.

They also published a demo app showcasing all the functionality available in the React package:
🔗 https://yo-protocol-react-example.vercel.app

The demo is fully open source, so you can explore the implementation here:
🔗 https://github.com/AndonMitev/yo-protocol-react-example

Additionally, they've created Skills for both the core and react packages (previously only core was available). You can browse them here:
🔗 https://github.com/yoprotocol/yo-protocol-skills/tree/main/skills

These skills will also scan your existing codebase and automatically migrate your current integration to the new one.

They are also listed on https://skillsmp.com
 — just search for "yo-protocol".
(Note: SkillsMP updates listings every 1–2 days, so the React skill may not be visible yet.)
```
- Visit with Playwright MCP: https://yo-protocol-react-example.vercel.app
- Update packages
- Update skills if not latest versions