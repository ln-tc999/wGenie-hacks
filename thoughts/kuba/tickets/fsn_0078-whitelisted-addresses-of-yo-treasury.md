# Show Whitelisted addresses for YO treasury

- I want to show if curently connected wallet address is granted with Whitelisted role
- These addresses can deposit to vault Fusion vaults
- YO treasury is an instance of Fusion Vault
- I want to do it only for yo-treasury vault: http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D
- Read it by calling method `hasRole`
- Show it in deposit/withdraw widget for Yo treasury
- If user doen't have a role disable deposit button
- If user has the role, then show indicator confirming that role is granted