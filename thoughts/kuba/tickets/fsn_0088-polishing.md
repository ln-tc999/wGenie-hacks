# Polishing YO Treasury hackathon project

## Wrong Protocol label

- In https://fusion-monorepo-web.vercel.app/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D
- I see `Protocol: wGenie Fusion` which is wrong - it should be `Protocol: YO and Fusion`

## No connect wallet button

- I don't see any button for connecting wallet
- It should be visible in top right corner where it usually is
- Also `Connect Wallet` button in deposit widget is disabled - should be enabled if no wallet connected

## Hide direct deposit / withdraw for yo vaults

- I mean yo vaults - child vaults used by YO Tresury to deposit to
- These vaults should not show these features - that's confusing - user should always use YO Treasury
- These pages are meant only for insights review purposes - linked in YO treasury overview
- Example yo vault http://localhost:3000/vaults/8453/0x0000000f2eb9f69274678c76222b35eec7588a65

## Landing page that sells the project

- Conponent: packages/web/src/yo-treasury/components/yo-landing-page.tsx
- Make this YO Treasury home page (landing page) content rich
- use .claude/skills/yo-design/SKILL.md skill
- Read files:
  - thoughts/kuba/notes/yo-hackathon/video-voiceover-script.md
  - thoughts/kuba/notes/yo-hackathon/project-details.md
- Make this landing page selling this product to portfolio managers, asset managers and also hackathon jusdges
- It should have standard corporate landing page flow: hero with CTA, listed features and benefits, footer section, CTA hooked in many places etc