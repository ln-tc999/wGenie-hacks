# [LOW] Validate address before casting to viem Address type

Parent: FSN-0026

## Problem

In `sidebar-user.tsx`, the address from Supabase user metadata is cast to viem's `Address` type without validation:

```typescript
<SidebarUserContent address={address as Address} onSignOut={signOut} />
```

The `address` comes from `user_metadata.custom_claims.address` (typed as `string | undefined`). If Supabase returns a non-checksummed, malformed, or unexpected value, downstream viem calls (ENS resolution, avatar lookup) could fail or behave unpredictably.

## Files

- `packages/web/src/components/sidebar/sidebar-user.tsx` (line 50)
- `packages/web/src/auth/use-auth.ts` (lines 38-41)

## Instructions

- Validate the address with `isAddress()` from viem before passing it to `SidebarUserContent`
- Use `getAddress()` from viem to normalize to checksummed format
- Return `null` from `SidebarUser` if the address is invalid, same as the `!address` check
