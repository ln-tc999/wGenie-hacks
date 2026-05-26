# Show Alpha address of YO treasury

- I want to show addresses which are granted with Alpha role
- I want to do it only for yo-treasury vault: http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D
- These addresses can execute internal transactions in vault Fusion vaults - in this case depositing to yo vaults
- YO treasury is an instance of Fusion Vault
- Read events emited when `grantRole` method is executed with alpha role
- Show it in overview page instead of `Active vaults` box
- Check is connected wallet has alpha role, if so show relevant message. Read it by calling method `hasRole`